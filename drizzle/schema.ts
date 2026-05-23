import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export const knowledgeTopics = mysqlTable("knowledge_topics", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  titleZh: varchar("titleZh", { length: 128 }).notNull(),
  titleEn: varchar("titleEn", { length: 128 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KnowledgeTopic = typeof knowledgeTopics.$inferSelect;

export const knowledgeItems = mysqlTable("knowledge_items", {
  id: int("id").autoincrement().primaryKey(),
  topicId: int("topicId").notNull(),
  titleZh: varchar("titleZh", { length: 256 }).notNull(),
  titleEn: varchar("titleEn", { length: 256 }).notNull(),
  formula: text("formula"),
  descriptionZh: text("descriptionZh"),
  descriptionEn: text("descriptionEn"),
  exampleZh: text("exampleZh"),
  exampleEn: text("exampleEn"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type InsertKnowledgeItem = typeof knowledgeItems.$inferInsert;

// ─── Teacher Documents ────────────────────────────────────────────────────────

export const teacherDocuments = mysqlTable("teacher_documents", {
  id: int("id").autoincrement().primaryKey(),
  titleZh: varchar("titleZh", { length: 256 }).notNull(),
  titleEn: varchar("titleEn", { length: 256 }).notNull(),
  category: mysqlEnum("category", ["notes", "syllabus", "worksheet", "other"]).default("notes").notNull(),
  filename: varchar("filename", { length: 256 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  fileSize: bigint("fileSize", { mode: "number" }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
  descriptionZh: text("descriptionZh"),
  descriptionEn: text("descriptionEn"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeacherDocument = typeof teacherDocuments.$inferSelect;
export type InsertTeacherDocument = typeof teacherDocuments.$inferInsert;