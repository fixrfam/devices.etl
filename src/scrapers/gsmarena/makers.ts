import chalk from "chalk";
import * as cheerio from "cheerio";
import { env } from "../../env";
import { upsertMaker } from "../../services/makers";
import { http } from "../../utils/http";

/** Parse the GSMarena makers page to brand entries */
function parseMakers($: cheerio.CheerioAPI) {
	const makers: Array<{
		name: string;
		slug: string;
		deviceCount: number;
	}> = [];

	$(".st-text table tr td a").each((_, el) => {
		const href = $(el).attr("href");
		const name = $(el).contents().first().text().trim();
		const countText = $(el).find("span").text().trim();
		const deviceCount = Number.parseInt(countText, 10) || 0;

		if (!href || !name) return;

		makers.push({
			name,
			slug: href.replace(/\.php$/, ""),
			deviceCount,
		});
	});

	return makers;
}

/** Filter makers by user-configured regex patterns */
function filterMakers(
	makers: Array<{ name: string; slug: string; deviceCount: number }>,
) {
	if (env.makersToScrape.length === 0) return makers;

	return makers.filter((b) =>
		env.makersToScrape.some((p) => new RegExp(p, "i").test(b.name)),
	);
}

export async function scrapeMakers() {
	const { data: html } = await http.get(env.gsmarenaMakersUrl);
	const $ = cheerio.load(html);

	const all = parseMakers($);
	const filtered = filterMakers(all);

	for (const maker of filtered) {
		await upsertMaker({
			name: maker.name,
			slug: maker.slug,
			url: `${env.gsmarenaBaseUrl}/${maker.slug}.php`,
			deviceCount: maker.deviceCount,
		});
		console.log(
			`  ${chalk.green("✓")} ${chalk.bold(maker.name)} (${maker.deviceCount} devices)`,
		);
	}

	return filtered;
}
