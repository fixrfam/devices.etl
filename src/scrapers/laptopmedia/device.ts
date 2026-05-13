import chalk from "chalk";
import { eq } from "drizzle-orm";
import type { Ora } from "ora";
import { db } from "../../db";
import { models } from "../../db/schema";
import type { ModelSelect } from "../../db/schema/models";
import { env } from "../../env";
import { getUnscrapedModels } from "../../services/models";
import { applyTransforms } from "../../transforms";
import { http } from "../../utils/http";
import { downloadImage } from "../../utils/images";

/**
 * Laptopmedia device scraper.
 *
 * laptopmedia.com is behind Cloudflare (403 from server IP), so we query
 * the Elastic App Search API (used by the frontend) instead of parsing HTML.
 * Returns structured data for CPU, GPU, display, storage, weight, etc.
 */

const SEARCH_ENDPOINT =
	"https://f9c93ee4270640ecab783317284098e2.ent-search.us-central1.gcp.cloud.es.io/api/as/v1/engines/laptops-usa/search";
const SEARCH_KEY = "search-rb7yrqtdfv7t5gg4oav9tgtw";

type Hit = Record<string, { raw: unknown } | undefined>;

/** Read a field's raw value from an Elastic hit */
function raw(hit: Hit, field: string): unknown {
	return hit[field]?.raw;
}

/** Read as string with optional fallback */
function str(hit: Hit, field: string, fallback = ""): string {
	return String(raw(hit, field) ?? fallback);
}

/** Convert kg to a gram-formatted string (e.g. "1290 g") for parseWeightGrams */
function toGrams(kg: unknown): string | null {
	if (!kg || Number(kg) <= 0) return null;
	return `${Math.round(Number(kg) * 1000)} g`;
}

/** Format SSD + HDD capacities to a human-readable string (e.g. "1000 GB SSD + 500 GB HDD") */
function formatStorage(ssd: unknown, hdd: unknown): string | null {
	const parts: string[] = [];
	if (Number(ssd) > 0) parts.push(`${ssd} GB SSD`);
	if (Number(hdd) > 0) parts.push(`${hdd} GB HDD`);
	return parts.length > 0 ? parts.join(" + ") : null;
}

/** Query Elastic API for a single laptop by its URL */
async function fetchSpecs(url: string): Promise<Hit | null> {
	const { data } = await http.post(
		SEARCH_ENDPOINT,
		{
			query: "",
			filters: { all: [{ url }] },
			page: { size: 1 },
		},
		{
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${SEARCH_KEY}`,
			},
		},
	);

	return (data.results?.[0] ?? null) as Hit | null;
}

/** Collect laptop-specific fields that have no dedicated column into the meta JSON */
function fillMeta(hit: Hit): Record<string, unknown> {
	return {
		ram: raw(hit, "ram"),
		refreshRate: raw(hit, "refresh_rate"),
		suitableFor: raw(hit, "suitable_for"),
		availability: raw(hit, "availability"),
		isNew: raw(hit, "is_new"),
		popularity: raw(hit, "popularity_last30days"),
		lastUpdated: raw(hit, "last_upd"),
		buyUrl: raw(hit, "buy_url"),
	};
}

/**
 * Map Elastic API fields to DB columns.
 *
 * Common fields (cpu, gpu, weight, display, etc.) map to existing columns.
 * Laptop-specific fields go into `meta` JSON. Data is formatted to be
 * compatible with existing transforms (weight in grams for parseWeightGrams,
 * display size as "X inches" for parseDisplaySizeInches).
 */
function buildDeviceData(hit: Hit): Record<string, unknown> {
	const data: Record<string, string> = {};

	data.cpu = str(hit, "cpu");
	data.gpu = str(hit, "gpu");

	if (raw(hit, "display_resolution")) data.displayResolution = str(hit, "display_resolution");

	const os = str(hit, "os") || str(hit, "operating_system");
	if (os) data.os = os;

	if (raw(hit, "panel_type")) data.displayType = str(hit, "panel_type");
	if (!data.displayType && raw(hit, "display_name")) data.displayType = str(hit, "display_name");

	const price = raw(hit, "price");
	if (price && Number(price) > 0) data.price = String(price);

	if (raw(hit, "date_published")) data.announced = str(hit, "date_published");

	const weight = toGrams(raw(hit, "weight"));
	if (weight) data.weight = weight;

	const storage = formatStorage(raw(hit, "storage_ssd"), raw(hit, "storage_hdd"));
	if (storage) data.internalMemory = storage;

	const displaySize = raw(hit, "display_size");
	if (displaySize && Number(displaySize) > 0) data.displaySize = `${displaySize} inches`;

	const meta = fillMeta(hit);
	const result = applyTransforms(data);
	result.meta = JSON.stringify(meta);

	return result;
}

/** Scrape specs for a single laptop: fetch → map → transform → save */
async function scrapeDevice(model: ModelSelect): Promise<boolean> {
	const hit = await fetchSpecs(model.url);
	if (!hit) {
		await db
			.update(models)
			.set({ scraped: 1, meta: JSON.stringify({ missing: true }) })
			.where(eq(models.id, model.id))
			.run();
		console.log(`  ${chalk.yellow("!")} ${chalk.bold(model.name)}: not found in Elastic`);
		return false;
	}

	const updateData = buildDeviceData(hit);

	/* Download image (best-effort) */
	if (env.imagesDir && model.imageUrl) {
		try {
			updateData.imageLocalPath = await downloadImage(
				model.imageUrl,
				env.imagesDir,
				model.slug,
			);
		} catch {
			/* non-fatal */
		}
	}

	updateData.scraped = 1;
	await db.update(models).set(updateData).where(eq(models.id, model.id)).run();

	console.log(`  ${chalk.green("✓")} ${chalk.bold(model.name)}`);
	return true;
}

export async function scrapeDevices(spinner: Ora): Promise<number> {
	const unscraped = (await getUnscrapedModels()).filter(
		(m) => m.category === "laptop",
	);
	let successCount = 0;

	for (const model of unscraped) {
		try {
			spinner.text = model.name;
			const ok = await scrapeDevice(model);
			if (ok) successCount++;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(`  ${chalk.red("✗")} ${chalk.bold(model.name)}: ${message}`);
		}
	}

	return successCount;
}
