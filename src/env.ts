function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

export type Site = "gsmarena" | "laptopmedia";

const rawSite = process.env.SITE;
const site: Site = rawSite === "laptopmedia" ? "laptopmedia" : "gsmarena";

const required: string[] = ["REQUEST_DELAY_MS"];
if (site === "gsmarena") {
	required.push("GSMARENA_BASE_URL", "GSMARENA_MAKERS_PAGE_URL");
} else {
	required.push("LAPTOPMEDIA_BASE_URL");
}
for (const name of required) {
	requireEnv(name);
}

export const env = {
	site,

	gsmarenaBaseUrl: process.env.GSMARENA_BASE_URL ?? "",
	gsmarenaMakersUrl: process.env.GSMARENA_MAKERS_PAGE_URL ?? "",
	makersToScrape:
		process.env.MAKERS_TO_SCRAPE?.split(",").filter(Boolean) ?? [],

	laptopmediaBaseUrl: process.env.LAPTOPMEDIA_BASE_URL ?? "",
	laptopmediaMakersToScrape:
		process.env.LAPTOPMEDIA_MAKERS_TO_SCRAPE?.split(",").filter(Boolean) ?? [],
	maxPerBrand: process.env.MAX_PER_BRAND
		? Number(process.env.MAX_PER_BRAND)
		: null,

	requestDelayMs: Number(requireEnv("REQUEST_DELAY_MS")),
	imagesDir: process.env.IMAGES_DIR,
	step: process.env.STEP,
	proxyFilePath: process.env.PROXY_FILE_PATH,
} as const;
