import chalk from "chalk";
import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";
import type { Ora } from "ora";
import { db } from "../../db";
import { makers } from "../../db/schema";
import { env } from "../../env";
import { getAllMakers } from "../../services/makers";
import { upsertModel } from "../../services/models";
import { inferModelCategory } from "../../utils/category";
import { http } from "../../utils/http";

/** Build GSMarena brand listing URL for a given page */
function brandPageUrl(makerSlug: string, page: number): string {
	if (page === 1) return `${env.gsmarenaBaseUrl}/${makerSlug}.php`;

	const match = makerSlug.match(/^(.*)-(\d+)$/);
	if (!match) return `${env.gsmarenaBaseUrl}/${makerSlug}.php`;

	return `${env.gsmarenaBaseUrl}/${match[1]}-f-${match[2]}-0-p${page}.php`;
}

/** Extract total page count from pagination nav */
function parseTotalPages($: cheerio.CheerioAPI): number {
	let max = 1;
	$(".nav-pages a").each((_, el) => {
		const text = $(el).text().trim();
		if (text === "◄" || text === "►") return;
		const n = Number.parseInt(text, 10);
		if (!Number.isNaN(n) && n > max) max = n;
	});
	return max;
}

/** Parse model listings from a brand page HTML */
function parseModels(
	html: string,
	makerId: number,
): Array<{
	makerId: number;
	name: string;
	slug: string;
	url: string;
	imageUrl: string | null;
	category: string | null;
}> {
	const $ = cheerio.load(html);
	const models: Array<{
		makerId: number;
		name: string;
		slug: string;
		url: string;
		imageUrl: string | null;
		category: string | null;
	}> = [];

	$(".makers ul li a").each((_, el) => {
		const href = $(el).attr("href");
		const name = $(el).find("strong span").text().trim();
		const imageUrl = $(el).find("img").attr("src");
		const title = $(el).find("img").attr("title") ?? "";

		if (!href || !name) return;

		models.push({
			makerId,
			name,
			slug: href.replace(/\.php$/, ""),
			url: `${env.gsmarenaBaseUrl}/${href}`,
			imageUrl: imageUrl ?? null,
			category: inferModelCategory(title),
		});
	});

	return models;
}

/** Fetch a brand page and upsert all models found */
async function processBrandPage(
	makerId: number,
	makerSlug: string,
	page: number,
): Promise<number> {
	const { data: html } = await http.get(brandPageUrl(makerSlug, page));
	const models = parseModels(html, makerId);

	await Promise.all(models.map((m) => upsertModel(m)));
	return models.length;
}

export async function scrapeModels(spinner: Ora) {
	const allMakers = await getAllMakers();

	for (const [i, maker] of allMakers.entries()) {
		if (!maker.slug.match(/-(\d+)$/)) {
			spinner.fail(`${maker.name}: could not parse brand ID from slug`);
			continue;
		}

		if (i > 0) spinner.start();
		spinner.text = maker.name;

		/* Fetch page 1 once. Gets totalPages AND models */
		const { data: html } = await http.get(brandPageUrl(maker.slug, 1));
		const totalPages = parseTotalPages(cheerio.load(html));
		let totalModels = await upsertModelsFromHtml(html, maker.id);
		spinner.text = `${maker.name}  ${chalk.dim(`page 1/${totalPages} (${totalModels} models)`)}`;

		/* Remaining pages */
		for (let page = 2; page <= totalPages; page++) {
			const count = await processBrandPage(maker.id, maker.slug, page);
			totalModels += count;
			spinner.text = `${maker.name}  ${chalk.dim(`page ${page}/${totalPages} (${count} models)`)}`;
		}

		await db
			.update(makers)
			.set({ pageCount: totalPages })
			.where(eq(makers.id, maker.id))
			.run();

		spinner.succeed(`${maker.name} (${totalPages} pages)`);
	}

	return allMakers.length;
}

/** Parse + upsert from pre-fetched HTML */
async function upsertModelsFromHtml(html: string, makerId: number) {
	const models = parseModels(html, makerId);
	await Promise.all(models.map((m) => upsertModel(m)));
	return models.length;
}
