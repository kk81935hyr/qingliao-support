import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";

describe("anonymous support chat", () => {
  it("creates a visitor conversation and exchanges text messages without authentication", async () => {
    const caller = appRouter.createCaller({} as any);
    const conversation = await caller.support.start();

    expect(conversation?.visitorToken).toHaveLength(32);

    await caller.support.send({
      visitorToken: conversation!.visitorToken,
      sender: "visitor",
      body: "需要咨询订单问题",
    });
    await caller.support.send({
      visitorToken: conversation!.visitorToken,
      sender: "agent",
      body: "您好，我来协助您。",
    });
    await caller.support.send({
      visitorToken: conversation!.visitorToken,
      sender: "visitor",
      imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQKQAAAABJRU5ErkJggg==",
      imageMime: "image/png",
    });

    const detail = await caller.support.messages({ visitorToken: conversation!.visitorToken });
    expect(detail.conversation?.id).toBe(conversation?.id);
    expect(detail.messages.map((message) => message.body)).toEqual(["需要咨询订单问题", "您好，我来协助您。", null]);
    expect(detail.messages[2]?.imageUrl).toMatch(/^\/manus-storage\/support\//);

    const inbox = await caller.support.inbox();
    expect(inbox.some((item) => item.visitorToken === conversation!.visitorToken)).toBe(true);
  });
});
