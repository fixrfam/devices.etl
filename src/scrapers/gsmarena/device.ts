import chalk from "chalk";
import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";
import type { Ora } from "ora";
import { db } from "../../db";
import { models } from "../../db/schema";
import type { ModelSelect } from "../../db/schema/models";
import { env } from "../../env";
import { getUnscrapedModels } from "../../services/models";
import { applyTransforms } from "../../transforms";
import { isBlocked } from "../../utils/blocked";
import { getCached, setCache } from "../../utils/cache";
import { getLastProxy, http, isRateLimited } from "../../utils/http";
import { downloadImage } from "../../utils/images";

/** Maps GSMarena `data-spec` attribute values to DB column names */
const DATA_SPEC_MAP: Record<string, string> = {
	nettech: "networkTech",
	dimensions: "dimensions",
	weight: "weight",
	build: "build",
	sim: "sim",
	displaytype: "displayType",
	displaysize: "displaySize",
	displayresolution: "displayResolution",
	displayprotection: "displayProtection",
	os: "os",
	chipset: "chipset",
	cpu: "cpu",
	gpu: "gpu",
	memoryslot: "cardSlot",
	internalmemory: "internalMemory",
	cam1modules: "mainCamera",
	cam1features: "mainCameraFeatures",
	cam1video: "mainCameraVideo",
	cam2modules: "selfieCamera",
	cam2features: "selfieFeatures",
	cam2video: "selfieVideo",
	batdescription1: "battery",
	colors: "colors",
	models: "modelsText",
	price: "price",
	sensors: "sensors",
	year: "announced",
	status: "status",
};

/** Extract known specs + unknown meta from a device page */
function extractSpecs($: cheerio.CheerioAPI) {
	const name = $("h1.specs-phone-name-title").text().trim();
	const specs: Record<string, string> = {};
	const meta: Record<string, string> = {};

	$("#specs-list table").each((_, table) => {
		$(table)
			.find("tr")
			.each((_, row) => {
				const spec = $(row).find("[data-spec]").attr("data-spec");
				const value = $(row).find(".nfo").text().trim();
				if (!spec || !value) return;

				const column = DATA_SPEC_MAP[spec];
				if (column) specs[column] = value;
				else meta[spec] = value;
			});
	});

	return { name, specs, meta };
}

/** Format a proxy note for error messages */
function proxyNote(): string {
	const proxy = getLastProxy();
	return proxy ? chalk.dim(` [proxy: ${proxy.host}:${proxy.port}]`) : "";
}

/** Scrape specs for a single device: fetch / parse / transform / save */
async function scrapeDevice(model: ModelSelect): Promise<boolean> {
	const cached = await getCached(model.slug);
	const html = cached ?? (await http.get(model.url)).data;
	if (!cached) await setCache(model.slug, html);

	if (isBlocked(html)) throw new Error("Blocked by GSMarena");

	const $ = cheerio.load(html);
	const { name, specs, meta } = extractSpecs($);
	const transformed = applyTransforms(specs);

	const updateData: Record<string, unknown> = {
		...transformed,
		meta: JSON.stringify(meta),
	};

	/* Download image (non-fatal on failure) */
	if (env.imagesDir && model.imageUrl) {
		try {
			updateData.imageLocalPath = await downloadImage(
				model.imageUrl,
				env.imagesDir,
				model.slug,
			);
		} catch {
			/* image download is best-effort */
		}
	}

	updateData.scraped = 1;

	await db.update(models).set(updateData).where(eq(models.id, model.id)).run();

	console.log(`  ${chalk.green("✓")} ${chalk.bold(name)}`);
	return true;
}

export async function scrapeDevices(spinner: Ora) {
	const unscraped = await getUnscrapedModels();
	let successCount = 0;

	for (const model of unscraped) {
		if (isRateLimited()) {
			throw new Error(`${chalk.red("✗")} rate limited, aborting`);
		}

		try {
			spinner.text = model.name;
			const ok = await scrapeDevice(model);
			if (ok) successCount++;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(
				`  ${chalk.red("✗")} ${chalk.bold(model.name)}: ${message}${proxyNote()}`,
			);
			if (message.includes("aborting")) throw err;
		}
	}

	return successCount;
}
