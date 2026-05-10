import { eq } from "drizzle-orm";
import { db } from "../db";
import type { MakerInsert } from "../db/schema";
import { makers } from "../db/schema";

export async function upsertMaker(data: MakerInsert) {
	const existing = await db
		.select()
		.from(makers)
		.where(eq(makers.slug, data.slug))
		.all();

	if (existing.length > 0) {
		return db.update(makers).set(data).where(eq(makers.slug, data.slug)).run();
	}

	return db.insert(makers).values(data).run();
}

export async function getAllMakers() {
	return db.select().from(makers).all();
}
