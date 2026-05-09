import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const brands = sqliteTable("brands", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  slug: text().notNull().unique(),
  url: text().notNull(),
  deviceCount: integer("device_count").notNull().default(0),
  pageCount: integer("page_count"),
  createdAt: text("created_at")
    .notNull()
    .$default(() => new Date().toISOString()),
});

export type BrandInsert = typeof brands.$inferInsert;
export type BrandSelect = typeof brands.$inferSelect;
