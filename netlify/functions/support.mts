type JsonRecord = Record<string, unknown>;

const headers = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-visitor-token",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

function json(data: JsonRecord, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase 环境变量尚未配置");
  return { url, key };
}

async function supabase(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(body || `Supabase 请求失败 (${response.status})`);
  return body ? JSON.parse(body) : [];
}

function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function normalConversation(row: JsonRecord) {
  return {
    id: row.id,
    visitorToken: row.visitor_token ?? row.visitorToken,
    visitorLabel: row.visitor_label ?? row.visitorLabel,
    status: row.status,
    createdAt: row.created_at ?? row.createdAt,
    lastMessageAt: row.last_message_at ?? row.lastMessageAt,
  };
}

function normalMessage(row: JsonRecord) {
  return {
    id: row.id,
    conversationId: row.conversation_id ?? row.conversationId,
    sender: row.sender,
    body: row.body ?? null,
    imageUrl: row.image_url ?? row.imageUrl ?? null,
    createdAt: row.created_at ?? row.createdAt,
  };
}

async function conversationByToken(visitorToken: string) {
  const rows = await supabase(`support_conversations?visitor_token=eq.${encodeURIComponent(visitorToken)}&select=*&limit=1`);
  return rows[0] ? normalConversation(rows[0]) : null;
}

async function uploadImage(base64: string, mime = "image/png") {
  const { url, key } = config();
  const extension = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const path = `${token()}.${extension}`;
  const binary = Uint8Array.from(Buffer.from(base64, "base64"));
  const response = await fetch(`${url}/storage/v1/object/support-images/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": mime, "x-upsert": "false" },
    body: binary,
  });
  if (!response.ok) throw new Error(await response.text());
  return `${url}/storage/v1/object/public/support-images/${path}`;
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  try {
    const url = new URL(request.url);
    const payload = request.method === "GET" ? Object.fromEntries(url.searchParams.entries()) : await request.json() as JsonRecord;
    const action = String(payload.action ?? "");

    if (action === "start") {
      const visitorToken = token();
      const rows = await supabase("support_conversations", {
        method: "POST",
        body: JSON.stringify({ visitor_token: visitorToken, visitor_label: `访客 ${visitorToken.slice(0, 4).toUpperCase()}`, status: "open" }),
      });
      return json({ conversation: normalConversation(rows[0]) });
    }

    if (action === "inbox") {
      const rows = await supabase("support_conversations?select=*&order=last_message_at.desc");
      return json({ conversations: rows.map(normalConversation) });
    }

    if (action === "messages") {
      const visitorToken = String(payload.visitorToken ?? "");
      const conversation = await conversationByToken(visitorToken);
      if (!conversation) return json({ error: "客服会话不存在" }, 404);
      const rows = await supabase(`support_messages?conversation_id=eq.${conversation.id}&select=*&order=created_at.asc`);
      return json({ conversation, messages: rows.map(normalMessage) });
    }

    if (action === "send") {
      const visitorToken = String(payload.visitorToken ?? "");
      const sender = payload.sender === "agent" ? "agent" : "visitor";
      const conversation = await conversationByToken(visitorToken);
      if (!conversation) return json({ error: "客服会话不存在" }, 404);
      const body = typeof payload.body === "string" ? payload.body.trim() : "";
      const imageBase64 = typeof payload.imageBase64 === "string" ? payload.imageBase64 : "";
      if (!body && !imageBase64) return json({ error: "消息内容不能为空" }, 400);
      if (body.length > 2000) return json({ error: "消息过长" }, 400);
      let imageUrl: string | null = null;
      if (imageBase64) {
        if (imageBase64.length > 2_100_000) return json({ error: "图片不能超过 1.5MB" }, 413);
        imageUrl = await uploadImage(imageBase64, String(payload.imageMime ?? "image/png"));
      }
      const rows = await supabase("support_messages", {
        method: "POST",
        body: JSON.stringify({ conversation_id: conversation.id, sender, body: body || null, image_url: imageUrl }),
      });
      await supabase(`support_conversations?id=eq.${conversation.id}`, { method: "PATCH", body: JSON.stringify({ last_message_at: new Date().toISOString(), status: "open" }) });
      return json({ success: true, imageUrl, message: rows[0] ? normalMessage(rows[0]) : null });
    }

    return json({ error: "未知客服操作" }, 400);
  } catch (error) {
    console.error("[support]", error);
    return json({ error: error instanceof Error ? error.message : "客服服务暂时不可用" }, 500);
  }
}
