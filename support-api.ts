import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";

export type SupportSender = "visitor" | "agent";
export type SupportConversation = {
  id: string;
  visitorToken: string;
  visitorLabel: string;
  status: "open" | "closed";
  createdAt: string;
  lastMessageAt: string;
};
export type SupportMessage = {
  id: string;
  conversationId: string;
  sender: SupportSender;
  body: string | null;
  imageUrl: string | null;
  createdAt: string;
};

function endpoint() {
  const explicit = process.env.EXPO_PUBLIC_SUPPORT_API_URL?.replace(/\/$/, "");
  if (explicit) return `${explicit}/api/support`;
  const apiBase = getApiBaseUrl();
  if (apiBase) return `${apiBase}/api/support`;
  return Platform.OS === "web" ? "/api/support" : "";
}

async function request<T>(init: RequestInit & { action: string }): Promise<T> {
  const base = endpoint();
  if (!base) throw new Error("客服服务地址尚未配置");
  const { action, ...options } = init;
  const url = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (options.method === "GET") url.searchParams.set("action", action);
  const response = await fetch(url.toString(), {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    body: options.method === "GET" ? undefined : JSON.stringify({ action, ...(options.body ? JSON.parse(String(options.body)) : {}) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "客服服务暂时不可用");
  return payload as T;
}

export function startSupportConversation() {
  return request<{ conversation: SupportConversation }>({ action: "start", method: "POST", body: "{}" });
}

export function getSupportMessages(visitorToken: string) {
  return request<{ conversation: SupportConversation | null; messages: SupportMessage[] }>({
    action: "messages",
    method: "GET",
    headers: { "x-visitor-token": visitorToken },
  });
}

export function getSupportInbox() {
  return request<{ conversations: SupportConversation[] }>({ action: "inbox", method: "GET" });
}

export function sendSupportMessage(input: {
  visitorToken: string;
  sender: SupportSender;
  body?: string;
  imageBase64?: string;
  imageMime?: string;
}) {
  return request<{ success: true; imageUrl: string | null }>({
    action: "send",
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function registerSupportDevice(expoPushToken: string) {
  return request<{ success: true }>({
    action: "register-device",
    method: "POST",
    body: JSON.stringify({ expoPushToken }),
  });
}
