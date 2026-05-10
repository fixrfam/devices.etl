import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { makers } from "../db/schema";
import { env } from "../env";
import { getAllMakers } from "../services/makers";
import { upsertModel } from "../services/models";
import { inferModelCategory } from "../utils/category";
import { http } from "../utils/http";

function buildPageUrl(makerSlug: string, page: number): string {
	if (page === 1) {
		return `${env.gsmarenaBaseUrl}/${makerSlug}.php`;
	}
	const match = makerSlug.match(/^(.*)-(\d+)$/);
	if (!match) return `${env.gsmarenaBaseUrl}/${makerSlug}.php`;
	const base = match[1];
	const id = match[2];
	return `${env.gsmarenaBaseUrl}/${base}-f-${id}-0-p${page}.php`;
}

function parseTotalPages($: cheerio.CheerioAPI): number {
	let maxPage = 1;
	$(".nav-pages a").each((_, el) => {
		const text = $(el).text().trim();
		if (text === "◄" || text === "►") return;
		const page = Number.parseInt(text, 10);
		if (!Number.isNaN(page) && page > maxPage) {
			maxPage = page;
		}
	});
	return maxPage;
}

async function scrapeMakerPage(
	makerId: number,
	makerSlug: string,
	page: number,
) {
	const url = buildPageUrl(makerSlug, page);
	const { data: html } = await http.get(url);
	const $ = cheerio.load(html);

	const promises: Array<Promise<unknown>> = [];

	$(".makers ul li a").each((_, el) => {
		const href = $(el).attr("href");
		const name = $(el).find("strong span").text().trim();
		const imageUrl = $(el).find("img").attr("src");
		const title = $(el).find("img").attr("title") ?? "";

		if (!href || !name) return;

		const slug = href.replace(/\.php$/, "");
		const category = inferModelCategory(title);

		promises.push(
			upsertModel({
				makerId,
				name,
				slug,
				url: `${env.gsmarenaBaseUrl}/${href}`,
				imageUrl: imageUrl ?? null,
				category,
			}),
		);
	});

	await Promise.all(promises);
	return promises.length;
}

export async function scrapeModels() {
	const allMakers = await getAllMakers();

	for (const maker of allMakers) {
		if (!maker.slug.match(/-(\d+)$/)) {
			console.warn(`  ✗ ${maker.name}: could not parse brand ID from slug`);
			continue;
		}

		const { data: html } = await http.get(buildPageUrl(maker.slug, 1));
		const $ = cheerio.load(html);
		const totalPages = parseTotalPages($);

		console.log(`  ${maker.name} (${totalPages} pages)`);
		let totalModels = 0;

		totalModels += await scrapeMakerPage(maker.id, maker.slug, 1);
		console.log(`    page 1/${totalPages} (${totalModels} models)`);

		for (let page = 2; page <= totalPages; page++) {
			const count = await scrapeMakerPage(maker.id, maker.slug, page);
			totalModels += count;
			console.log(`    page ${page}/${totalPages} (${count} models)`);
		}

		await db
			.update(makers)
			.set({ pageCount: totalPages })
			.where(eq(makers.id, maker.id))
			.run();
	}

	return allMakers.length;
}
