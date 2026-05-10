import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const CACHE_DIR = "data/cache";

function cachePath(slug: string): string {
	return `${CACHE_DIR}/${slug}.html`;
}

export async function getCached(slug: string): Promise<string | null> {
	const path = cachePath(slug);
	if (!existsSync(path)) return null;
	return readFile(path, "utf8");
}

export async function setCache(slug: string, html: string): Promise<void> {
	if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
	await writeFile(cachePath(slug), html);
}
