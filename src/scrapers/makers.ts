import * as cheerio from "cheerio";
import { env } from "../env";
import { upsertMaker } from "../services/makers";
import { http } from "../utils/http";

export async function scrapeMakers() {
	const { data: html } = await http.get(env.gsmarenaMakersUrl);
	const $ = cheerio.load(html);

	const makers: Array<{ name: string; slug: string; deviceCount: number }> = [];

	$(".st-text table tr td a").each((_, el) => {
		const href = $(el).attr("href");
		const name = $(el).contents().first().text().trim();
		const countText = $(el).find("span").text().trim();
		const deviceCount = Number.parseInt(countText, 10) || 0;

		if (!href || !name) return;

		const slug = href.replace(/\.php$/, "");
		makers.push({ name, slug, deviceCount });
	});

	const filtered =
		env.makersToScrape.length > 0
			? makers.filter((b) =>
					env.makersToScrape.some((p) => new RegExp(p, "i").test(b.name)),
				)
			: makers;

	for (const maker of filtered) {
		const pageUrl = `${env.gsmarenaBaseUrl}/${maker.slug}.php`;
		await upsertMaker({
			name: maker.name,
			slug: maker.slug,
			url: pageUrl,
			deviceCount: maker.deviceCount,
		});
		console.log(`  ✓ ${maker.name} (${maker.deviceCount} devices)`);
	}

	return filtered;
}
