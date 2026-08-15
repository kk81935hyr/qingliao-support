import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";

export type SupportSender = "visitor" | "agent";
export type SupportConversation = { id: string | number; visitorToken: string; visitorLabel: string; status: string; createdAt: string; lastMessageAt: string };
export type SupportMessage = { id: string | number; conversationId: string | number; sender: SupportSender; body: string | null; imageUrl: string | null; createdAt: string };

function endpoint() {
  const explicit = process.env.EXPO_PUBLIC_SUPPORT_API_URL?.replace(/\/$/, "");
  if (explicit) return `${explicit}/api/support`;
  const api = getApiBaseUrl();
  if (api) return `${api}/api/support`;
  return Platform.OS === "web" ? "/api/support" : "";
}

async function request<T>(action: string, method: "GET" | "POST", payload: Record<string, unknown> = {}) {
  const base = endpoint();
  if (!base) throw new Error("客服服务地址尚未配置");
  const url = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  const options: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (method === "GET") Object.entries({ action, ...payload }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  else options.body = JSON.stringify({ action, ...payload });
  const response = await fetch(url.toString(), options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "客服服务暂时不可用");
  return data as T;
}

export const startSupportConversation = () => request<{ conversation: SupportConversation }>("start", "POST");
export const getSupportInbox = () => request<{ conversations: SupportConversation[] }>("inbox", "GET");
export const getSupportMessages = (visitorToken: string) => request<{ conversation: SupportConversation | null; messages: SupportMessage[] }>("messages", "GET", { visitorToken });
export const sendSupportMessage = (payload: { visitorToken: string; sender: SupportSender; body?: string; imageBase64?: string; imageMime?: string }) => request<{ success: true; imageUrl: string | null }>("send", "POST", payload);
