import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial().primaryKey(),
  endpoint: text().notNull().unique(),
  p256dh: text().notNull(),
  auth: text().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const nativePushTokens = pgTable("native_push_tokens", {
  id: serial().primaryKey(),
  token: text().notNull().unique(),
  platform: text().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
