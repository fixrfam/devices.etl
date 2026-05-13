export { scrapeMakers } from "./makers";
export { scrapeModels } from "./models";

export async function scrapeDevices(_spinner: import("ora").Ora): Promise<number> {
	throw new Error("laptopmedia: device step not yet implemented");
}
