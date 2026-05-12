import { env, type Site } from "../env";

type SiteModule = {
	scrapeMakers(): Promise<Array<{ name: string; slug: string }>>;
	scrapeModels(spinner: import("ora").Ora): Promise<number>;
	scrapeDevices(spinner: import("ora").Ora): Promise<number>;
};

const modules: Record<Site, () => Promise<SiteModule>> = {
	gsmarena: () => import("./gsmarena"),
	laptopmedia: () => import("./laptopmedia"),
};

const site: Site = env.site;

export async function scrapeMakers() {
	return (await modules[site]()).scrapeMakers();
}

export async function scrapeModels(spinner: import("ora").Ora) {
	return (await modules[site]()).scrapeModels(spinner);
}

export async function scrapeDevices(spinner: import("ora").Ora) {
	return (await modules[site]()).scrapeDevices(spinner);
}
