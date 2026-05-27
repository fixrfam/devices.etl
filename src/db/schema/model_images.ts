import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { models } from "./models";

export const modelImages = sqliteTable("model_images", {
	id: integer().primaryKey({ autoIncrement: true }),
	modelId: integer("model_id")
		.notNull()
		.references(() => models.id),
	originalUrl: text("original_url"),
	r2Key: text("r2_key"),
	isPrimary: integer("is_primary").notNull().default(0),
	variant: text(),
	position: integer().notNull().default(0),
	createdAt: text("created_at")
		.notNull()
		.$default(() => new Date().toISOString()),
});

export type ModelImageInsert = typeof modelImages.$inferInsert;
export type ModelImageSelect = typeof modelImages.$inferSelect;
