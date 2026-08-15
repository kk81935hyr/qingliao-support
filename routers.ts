import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  support: router({
    start: publicProcedure.mutation(async () => {
      const visitorToken = crypto.randomUUID().replace(/-/g, "");
      const visitorLabel = `访客 ${visitorToken.slice(-4).toUpperCase()}`;
      const conversation = await db.createSupportConversation(visitorToken, visitorLabel);
      return conversation;
    }),
    inbox: publicProcedure.query(() => db.listSupportConversations()),
    messages: publicProcedure
      .input(z.object({ visitorToken: z.string().length(32) }))
      .query(async ({ input }) => {
        const conversation = await db.getSupportConversationByToken(input.visitorToken);
        if (!conversation) return { conversation: null, messages: [] };
        const messages = await db.listSupportMessages(conversation.id);
        return { conversation, messages };
      }),
    send: publicProcedure
      .input(z.object({
        visitorToken: z.string().length(32),
        sender: z.enum(["visitor", "agent"]),
        body: z.string().trim().max(1000).optional(),
        imageBase64: z.string().max(2200000).optional(),
        imageMime: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
      }).refine((input) => Boolean(input.body || input.imageBase64), "消息内容不能为空"))
      .mutation(async ({ input }) => {
        const conversation = await db.getSupportConversationByToken(input.visitorToken);
        if (!conversation) throw new Error("客服会话不存在");
        let imageUrl: string | undefined;
        if (input.imageBase64 && input.imageMime) {
          const extension = input.imageMime === "image/png" ? "png" : input.imageMime === "image/webp" ? "webp" : "jpg";
          const buffer = Buffer.from(input.imageBase64, "base64");
          if (buffer.byteLength > 1600000) throw new Error("图片不能超过 1.5MB");
          const stored = await storagePut(`support/${conversation.id}/${Date.now()}.${extension}`, buffer, input.imageMime);
          imageUrl = stored.url;
        }
        await db.createSupportMessage({
          conversationId: conversation.id,
          sender: input.sender,
          body: input.body || null,
          imageUrl: imageUrl || null,
        });
        return { success: true, imageUrl };
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
