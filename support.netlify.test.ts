import { describe, expect, it } from "vitest";
import supportHandler from "../netlify/functions/support.mts";

async function call(action: string, payload?: Record<string, unknown>) {
  const query = new URLSearchParams({ action, ...(payload ?? {}) });
  const isGet = action === "messages" || action === "inbox";
  const request = new Request(`https://test.local/api/support${isGet ? `?${query}` : ""}`, {
    method: isGet ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: isGet ? undefined : JSON.stringify({ action, ...(payload ?? {}) }),
  });
  const response = await supportHandler(request);
  return { response, data: await response.json() };
}

describe("Netlify-compatible support API", () => {
  it("accepts the configured Supabase server credentials", async () => {
    expect(process.env.SUPABASE_URL).toMatch(/^https:\/\/.+\.supabase\.co$/);
    expect(process.env.SUPABASE_SECRET_KEY).toBeTruthy();
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: process.env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}` },
    });
    expect(response.ok).toBe(true);
  });

  it("accepts a small PNG image message", async () => {
    const start = await call("start");
    const token = start.data.conversation.visitorToken as string;
    const image = await call("send", {
      visitorToken: token,
      sender: "visitor",
      imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      imageMime: "image/png",
    });
    expect(image.response.ok).toBe(true);
    expect(image.data.imageUrl).toMatch(/^https:\/\//);
  });

  it("creates an anonymous conversation and accepts text", async () => {
    const start = await call("start");
    expect(start.response.ok).toBe(true);
    const token = start.data.conversation.visitorToken as string;
    const send = await call("send", { visitorToken: token, sender: "visitor", body: "自动化测试消息" });
    expect(send.response.ok).toBe(true);
    const messages = await call("messages", { visitorToken: token });
    expect(messages.data.messages.some((item: { body: string }) => item.body === "自动化测试消息")).toBe(true);
  });
});
