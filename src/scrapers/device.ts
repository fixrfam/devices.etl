import chalk from "chalk";
import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";
import type { Ora } from "ora";
import { db } from "../db";
import { models } from "../db/schema";
import { env } from "../env";
import { getUnscrapedModels } from "../services/models";
import { http } from "../utils/http";
import { downloadImage } from "../utils/images";

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

export async function scrapeDevices(spinner: Ora) {
	const unscraped = await getUnscrapedModels();
	let successCount = 0;

	for (const [_, model] of unscraped.entries()) {
		try {
			spinner.text = model.name;

			const { data: html } = await http.get(model.url);
			const $ = cheerio.load(html);
			const { name, specs, meta } = extractSpecs($);

			const updateData: Record<string, unknown> = {
				...specs,
				meta: JSON.stringify(meta),
			};

			if (env.imagesDir && model.imageUrl) {
				try {
					updateData.imageLocalPath = await downloadImage(
						model.imageUrl,
						env.imagesDir,
						model.slug,
					);
				} catch {
					// image download failure is non-fatal
				}
			}

			updateData.scraped = 1;

			await db
				.update(models)
				.set(updateData)
				.where(eq(models.id, model.id))
				.run();

			console.log(`  ${chalk.green("✓")} ${chalk.bold(name)}`);
			successCount++;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(
				`  ${chalk.red("✗")} ${chalk.bold(model.name)}: ${message}`,
			);
			if (message.includes("429")) break;
		}
	}

	return successCount;
}
