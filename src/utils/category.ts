import { eq } from "drizzle-orm";
import { db } from "../db";
import { categories } from "../db/schema";

const KNOWN_CATEGORIES = [
  ["smartphone", "phone"],
  ["phone", "phone"],
  ["tablet", "tablet"],
  ["watch", "watch"],
  ["band", "band"],
] as const;

export function inferModelCategory(title: string): string {
  const lower = title.toLowerCase();
  for (const [keyword, category] of KNOWN_CATEGORIES) {
    if (lower.includes(keyword)) return category;
  }
  return "phone";
}

export async function getCategoryId(slug: string): Promise<number | null> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .all();
  if (existing.length > 0) return existing[0]?.id ?? null;

  const inserted = await db
    .insert(categories)
    .values({ name: slug.charAt(0).toUpperCase() + slug.slice(1), slug })
    .run();
  return Number(inserted.lastInsertRowid);
}
