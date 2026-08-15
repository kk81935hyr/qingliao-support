import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const MAX_IMAGE_BYTES = 1_572_864;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const client = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Supabase configuration missing");
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
};
const conversation = (x: any) => ({ id: x.id, visitorToken: x.visitor_token, visitorLabel: x.visitor_label, status: x.status, createdAt: x.created_at, lastMessageAt: x.last_message_at });
const message = (x: any) => ({ id: x.id, conversationId: x.conversation_id, sender: x.sender, body: x.body, imageUrl: x.image_url, createdAt: x.created_at });

async function notifyAgents(item: any, preview: string) {
  const supabase = client();
  const { data: devices } = await supabase.from("support_devices").select("expo_push_token").eq("active", true);
  if (!devices?.length) return;
  const url = `qingliao://agent/${item.visitor_token}?label=${encodeURIComponent(item.visitor_label)}`;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(devices.map((x) => ({ to: x.expo_push_token, title: "新的访客咨询", body: preview, sound: "default", channelId: "support-messages", data: { url } }))),
  });
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const supabase = client();
    const url = new URL(request.url);
    const input: any = request.method === "GET" ? Object.fromEntries(url.searchParams) : await request.json();
    const action = input.action;
    if (request.method === "POST" && action === "start") {
      const token = crypto.randomUUID().replace(/-/g, "");
      const { data, error } = await supabase.from("support_conversations").insert({ visitor_token: token, visitor_label: `访客 ${token.slice(-4).toUpperCase()}` }).select().single();
      if (error) throw error;
      return json({ conversation: conversation(data) });
    }
    if (request.method === "GET" && action === "inbox") {
      const { data, error } = await supabase.from("support_conversations").select("*").order("last_message_at", { ascending: false });
      if (error) throw error;
      return json({ conversations: (data ?? []).map(conversation) });
    }
    if (request.method === "GET" && action === "messages") {
      const token = String(input.visitorToken ?? "");
      const { data: item, error: ce } = await supabase.from("support_conversations").select("*").eq("visitor_token", token).maybeSingle();
      if (ce) throw ce;
      if (!item) return json({ conversation: null, messages: [] });
      const { data, error } = await supabase.from("support_messages").select("*").eq("conversation_id", item.id).order("created_at", { ascending: true });
      if (error) throw error;
      return json({ conversation: conversation(item), messages: (data ?? []).map(message) });
    }
    if (request.method === "POST" && action === "register-device") {
      const token = input.expoPushToken;
      if (typeof token !== "string" || !token.startsWith("ExponentPushToken[")) return json({ error: "无效推送令牌" }, 400);
      const { error } = await supabase.from("support_devices").upsert({ expo_push_token: token, active: true, updated_at: new Date().toISOString() }, { onConflict: "expo_push_token" });
      if (error) throw error;
      return json({ success: true });
    }
    if (request.method === "POST" && action === "send") {
      const token = input.visitorToken;
      const sender = input.sender;
      const body = typeof input.body === "string" ? input.body.trim().slice(0, 1000) : "";
      const imageBase64 = typeof input.imageBase64 === "string" ? input.imageBase64 : "";
      const imageMime = input.imageMime;
      if (typeof token !== "string" || !["visitor", "agent"].includes(sender) || (!body && !imageBase64)) return json({ error: "无效消息" }, 400);
      const { data: item, error: ce } = await supabase.from("support_conversations").select("*").eq("visitor_token", token).maybeSingle();
      if (ce) throw ce;
      if (!item) return json({ error: "客服会话不存在" }, 404);
      let imageUrl: string | null = null;
      if (imageBase64) {
        if (!ALLOWED_MIME_TYPES.has(imageMime)) return json({ error: "不支持的图片格式" }, 400);
        const bytes = Buffer.from(imageBase64, "base64");
        if (!bytes.length || bytes.byteLength > MAX_IMAGE_BYTES) return json({ error: "图片不能超过 1.5MB" }, 400);
        const ext = imageMime === "image/png" ? "png" : imageMime === "image/webp" ? "webp" : "jpg";
        const path = `${item.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("support-images").upload(path, bytes, { contentType: imageMime, upsert: false });
        if (error) throw error;
        imageUrl = supabase.storage.from("support-images").getPublicUrl(path).data.publicUrl;
      }
      const { error: me } = await supabase.from("support_messages").insert({ conversation_id: item.id, sender, body: body || null, image_url: imageUrl });
      if (me) throw me;
      const { error: ue } = await supabase.from("support_conversations").update({ last_message_at: new Date().toISOString(), status: "open" }).eq("id", item.id);
      if (ue) throw ue;
      if (sender === "visitor") await notifyAgents(item, body || "[图片]");
      return json({ success: true, imageUrl });
    }
    return json({ error: "未找到接口" }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "服务暂时不可用" }, 500);
  }
};

export const config: Config = { path: "/api/support" };
