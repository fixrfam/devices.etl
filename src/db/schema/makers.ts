import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const makers = sqliteTable("makers", {
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

export type MakerInsert = typeof makers.$inferInsert;
export type MakerSelect = typeof makers.$inferSelect;
