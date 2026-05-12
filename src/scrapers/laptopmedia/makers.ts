import chalk from "chalk";
import { env } from "../../env";
import { upsertMaker } from "../../services/makers";
import { http } from "../../utils/http";

const SEARCH_ENDPOINT =
	"https://f9c93ee4270640ecab783317284098e2.ent-search.us-central1.gcp.cloud.es.io/api/as/v1/engines/laptops-usa/search";
const SEARCH_KEY = "search-rb7yrqtdfv7t5gg4oav9tgtw";

export async function scrapeMakers() {
	const { data } = await http.post(
		SEARCH_ENDPOINT,
		{
			query: "",
			page: { size: 1 },
			facets: { brand: { type: "value", size: 100 } },
		},
		{
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${SEARCH_KEY}`,
			},
		},
	);

	const brands: Array<{ value: string; count: number }> =
		data.facets?.brand?.[0]?.data ?? [];

	const makers = brands
		.filter((b) => b.value)
		.map((b) => ({
			name: b.value,
			slug: brandToSlug(b.value),
			url: `https://laptopmedia.com/manufacturer/${brandToSlug(b.value)}/`,
			deviceCount: b.count,
		}));

	const filtered =
		env.laptopmediaMakersToScrape.length > 0
			? makers.filter((b) =>
					env.laptopmediaMakersToScrape.some((p) => new RegExp(p, "i").test(b.name)),
				)
			: makers;

	for (const maker of filtered) {
		await upsertMaker({
			name: maker.name,
			slug: maker.slug,
			url: maker.url,
			deviceCount: maker.deviceCount,
		});
		console.log(
			`  ${chalk.green("✓")} ${chalk.bold(maker.name)} (${maker.deviceCount} devices)`,
		);
	}

	return filtered;
}

function brandToSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
