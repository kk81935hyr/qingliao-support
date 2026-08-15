import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import * as db from "../db";
import { storagePut } from "../storage";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.all("/api/support", async (req, res) => {
    try {
      const input = req.method === "GET" ? req.query : req.body;
      const action = String(input.action ?? "");
      const toConversation = (item: any) => item ? ({ id: item.id, visitorToken: item.visitorToken, visitorLabel: item.visitorLabel, status: item.status, createdAt: item.createdAt, lastMessageAt: item.lastMessageAt }) : null;
      const toMessage = (item: any) => ({ id: item.id, conversationId: item.conversationId, sender: item.sender, body: item.body, imageUrl: item.imageUrl, createdAt: item.createdAt });
      if (action === "start" && req.method === "POST") {
        const token = crypto.randomUUID().replace(/-/g, "");
        const item = await db.createSupportConversation(token, `访客 ${token.slice(-4).toUpperCase()}`);
        return res.json({ conversation: toConversation(item) });
      }
      if (action === "inbox" && req.method === "GET") {
        const items = await db.listSupportConversations();
        return res.json({ conversations: items.map(toConversation) });
      }
      if (action === "messages" && req.method === "GET") {
        const item = await db.getSupportConversationByToken(String(input.visitorToken ?? ""));
        if (!item) return res.json({ conversation: null, messages: [] });
        const items = await db.listSupportMessages(item.id);
        return res.json({ conversation: toConversation(item), messages: items.map(toMessage) });
      }
      if (action === "send" && req.method === "POST") {
        const token = String(input.visitorToken ?? "");
        const sender = input.sender === "agent" ? "agent" : "visitor";
        const body = typeof input.body === "string" ? input.body.trim().slice(0, 1000) : "";
        const item = await db.getSupportConversationByToken(token);
        if (!item) return res.status(404).json({ error: "客服会话不存在" });
        let imageUrl: string | null = null;
        if (input.imageBase64) {
          const mime = ["image/jpeg", "image/png", "image/webp"].includes(input.imageMime) ? input.imageMime : "image/jpeg";
          const buffer = Buffer.from(String(input.imageBase64), "base64");
          if (buffer.byteLength > 1572864) return res.status(400).json({ error: "图片不能超过 1.5MB" });
          const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
          imageUrl = (await storagePut(`support/${item.id}/${Date.now()}.${ext}`, buffer, mime)).url;
        }
        if (!body && !imageUrl) return res.status(400).json({ error: "消息内容不能为空" });
        await db.createSupportMessage({ conversationId: item.id, sender, body: body || null, imageUrl });
        return res.json({ success: true, imageUrl });
      }
      return res.status(404).json({ error: "未找到接口" });
    } catch (error) {
      console.error("support REST error", error);
      return res.status(500).json({ error: "客服服务暂时不可用" });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  const webDist = path.resolve(process.cwd(), "web-dist");
  app.use(express.static(webDist));
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res, next) => {
    res.sendFile(path.join(webDist, "index.html"), (error) => {
      if (error) next(error);
    });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
