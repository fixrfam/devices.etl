import chalk from "chalk";
import * as cheerio from "cheerio";
import { env } from "../../env";
import { upsertMaker } from "../../services/makers";
import { http } from "../../utils/http";

/** Parse maker links from the brand listing page. */
function parseMakers($: cheerio.CheerioAPI) {
	const makers: Array<{
		name: string;
		slug: string;
		url: string;
	}> = [];

	$(".brand-listing-container-frontpage a").each((_, el) => {
		const href = $(el).attr("href");
		const name = $(el).text().trim();
		if (!href || !name) return;

		const slug = href.replace(/^.*\/brand\//, "");
		makers.push({ name, slug, url: href });
	});

	return makers;
}

/**
 * Filter makers based on `displayspecsMakersToScrape` env patterns.
 * Returns all makers when no filter patterns are configured.
 */
function filterMakers(
	makers: Array<{ name: string; slug: string; url: string }>,
) {
	if (env.displayspecsMakersToScrape.length === 0) return makers;

	return makers.filter((b) =>
		env.displayspecsMakersToScrape.some((p) => new RegExp(p, "i").test(b.name)),
	);
}

/** Fetch the brand listing, parse and filter makers, then upsert each into the database. */
export async function scrapeMakers() {
	const { data: html } = await http.get(env.displayspecsBaseUrl + "/en");
	const $ = cheerio.load(html);

	const all = parseMakers($);
	const filtered = filterMakers(all);

	for (const maker of filtered) {
		await upsertMaker({
			name: maker.name,
			slug: maker.slug,
			url: maker.url,
			deviceCount: 0,
		});
		console.log(`  ${chalk.green("✓")} ${chalk.bold(maker.name)}`);
	}

	return filtered;
}
