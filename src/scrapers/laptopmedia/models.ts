import type { Ora } from "ora";
import { env } from "../../env";
import { getAllMakers } from "../../services/makers";
import { upsertModel } from "../../services/models";
import { http } from "../../utils/http";

/** Elastic App Search endpoint + public key (embedded in frontend JS) */
const SEARCH_ENDPOINT =
	"https://f9c93ee4270640ecab783317284098e2.ent-search.us-central1.gcp.cloud.es.io/api/as/v1/engines/laptops-usa/search";
const SEARCH_KEY = "search-rb7yrqtdfv7t5gg4oav9tgtw";

/** Regex matching well-known laptop model lines */
const POPULAR_SERIES =
	/(MacBook|ThinkPad|ThinkBook|Latitude|XPS|Spectre|ROG|TUF|ZenBook|Vivobook|IdeaPad|Yoga|Legion|Inspiron|Pavilion|Envy|ProBook|EliteBook|Elite Dragonfly|Surface|Predator|Swift|Aspire|Galaxy Book|Gram|Zephyrus|Strix|Stealth|Titan|Blade|G14|G16)/i;

type Hit = {
	name: { raw: string };
	url: { raw: string };
	thumb?: { raw: string };
};

type ModelData = {
	name: string;
	slug: string;
	url: string;
	imageUrl: string | null;
};

/** Main entry — iterates all makers and collects model listings */
export async function scrapeModels(spinner: Ora) {
	const allMakers = await getAllMakers();
	let totalModels = 0;

	for (const maker of allMakers) {
		spinner.text = maker.name;

		const collected = await collectModelsForBrand(maker);

		let upserted = 0;
		for (const m of collected) {
			await upsertModel({
				makerId: maker.id,
				name: m.name,
				slug: m.slug,
				url: m.url,
				imageUrl: m.imageUrl,
				category: "laptop",
			});
			upserted++;
		}

		totalModels += upserted;
		spinner.succeed(`${maker.name} (${upserted} models)`);
		if (upserted > 0) spinner.start();
	}

	return totalModels;
}

/**
 * Collects model listings for one brand via Elastic search.
 *
 * Sorting: newest-first so we bias toward current-gen hardware.
 * Dedup: strips trailing `-\d+` from slug to group SKU variants → one per series.
 * Filter: first 10 accepted must match POPULAR_SERIES regex (catches known lines).
 *          After 10 matches everything is accepted (including niche series).
 * Fallback: if API is exhausted with < 10 popular matches, re-collect without filter
 *           (handles small / niche brands like Razer, LG Gram).
 */
async function collectModelsForBrand(maker: { name: string }) {
	const seen = new Set<string>();
	const collected: ModelData[] = [];

	let page = 1;
	let matched = 0;
	const maxBrand = env.maxPerBrand ?? Infinity;
	let totalPages = Infinity;

	while (collected.length < maxBrand && page <= totalPages) {
		const { data } = await searchElastic({ brand: maker.name, page });
		totalPages = data.meta?.page?.total_pages ?? 0;

		for (const hit of data.results ?? []) {
			if (collected.length >= maxBrand) break;

			const model = toModel(hit, seen);
			if (!model) continue;

			const isMatch = POPULAR_SERIES.test(model.name);

			/* Require popular-series match for the first 10 slots */
			if (matched < 10 && !isMatch) continue;

			if (isMatch) matched++;
			collected.push(model);
		}

		page++;
	}

	/* Fallback: brand is too niche — re-collect without the popular filter */
	if (matched < 10 && collected.length < maxBrand) {
		const rest = await collectRemaining(maker.name, maxBrand, seen);
		collected.push(...rest);
	}

	return collected;
}

/**
 * Fallback pass: fetches remaining pages without the POPULAR_SERIES filter.
 * Used when a brand has very few popular-series matches (< 10).
 */
async function collectRemaining(
	brand: string,
	maxBrand: number,
	seen: Set<string>,
) {
	const collected: ModelData[] = [];
	let page = 1;
	let totalPages = Infinity;

	while (collected.length < maxBrand && page <= totalPages) {
		const { data } = await searchElastic({ brand, page });
		totalPages = data.meta?.page?.total_pages ?? 0;

		for (const hit of data.results ?? []) {
			if (collected.length >= maxBrand) break;

			const model = toModel(hit, seen);
			if (!model) continue;

			collected.push(model);
		}

		page++;
	}

	return collected;
}

/** POST to Elastic App Search with brand filter + pagination */
async function searchElastic({
	brand,
	page,
}: { brand: string; page: number }) {
	return http.post(
		SEARCH_ENDPOINT,
		{
			query: "",
			filters: { all: [{ brand }] },
			sort: [{ date_published: "desc" }],
			page: { current: page, size: 100 },
		},
		{
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${SEARCH_KEY}`,
			},
		},
	);
}

/** Parse a search hit → ModelData, dedup by series key (strip trailing `-\d+`) */
function toModel(hit: Hit, seen: Set<string>): ModelData | null {
	const url = hit.url?.raw ?? "";
	if (!url) return null;

	const slug = url.match(/\/laptop-specs\/([^/]+)\/?$/)?.[1] ?? null;
	if (!slug) return null;

	const seriesKey = slug.replace(/-\d+$/, "");
	if (seen.has(seriesKey)) return null;
	seen.add(seriesKey);

	return {
		name: hit.name?.raw ?? "",
		slug,
		url,
		imageUrl: hit.thumb?.raw ?? null,
	};
}
