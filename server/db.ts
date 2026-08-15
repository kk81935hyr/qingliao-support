import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, supportConversations, supportMessages, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createSupportConversation(visitorToken: string, visitorLabel: string) {
  const db = await getDb();
  if (!db) throw new Error("客服服务暂时不可用");
  await db.insert(supportConversations).values({ visitorToken, visitorLabel });
  return getSupportConversationByToken(visitorToken);
}

export async function getSupportConversationByToken(visitorToken: string) {
  const db = await getDb();
  if (!db) throw new Error("客服服务暂时不可用");
  const results = await db.select().from(supportConversations).where(eq(supportConversations.visitorToken, visitorToken)).limit(1);
  return results[0];
}

export async function listSupportConversations() {
  const db = await getDb();
  if (!db) throw new Error("客服服务暂时不可用");
  return db.select().from(supportConversations).orderBy(desc(supportConversations.lastMessageAt));
}

export async function listSupportMessages(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("客服服务暂时不可用");
  return db.select().from(supportMessages).where(eq(supportMessages.conversationId, conversationId)).orderBy(supportMessages.createdAt);
}

export async function createSupportMessage(input: {
  conversationId: number;
  sender: "visitor" | "agent";
  body?: string | null;
  imageUrl?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("客服服务暂时不可用");
  await db.insert(supportMessages).values(input);
  await db.update(supportConversations).set({ lastMessageAt: new Date(), status: "open" }).where(eq(supportConversations.id, input.conversationId));
}
