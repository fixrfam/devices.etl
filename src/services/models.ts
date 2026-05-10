import { eq } from "drizzle-orm";
import { db } from "../db";
import type { ModelInsert } from "../db/schema";
import { models } from "../db/schema";

export async function upsertModel(data: ModelInsert) {
	const existing = await db
		.select()
		.from(models)
		.where(eq(models.slug, data.slug))
		.all();

	if (existing.length > 0) {
		return db.update(models).set(data).where(eq(models.slug, data.slug)).run();
	}

	return db.insert(models).values(data).run();
}

export async function getUnscrapedModels() {
	return db.select().from(models).where(eq(models.scraped, 0)).all();
}

export async function markModelScraped(id: number) {
	return db.update(models).set({ scraped: 1 }).where(eq(models.id, id)).run();
}
