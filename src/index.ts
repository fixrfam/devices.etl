import { env } from "./env";
import { scrapeMakers } from "./scrapers/makers";
import { scrapeModels } from "./scrapers/models";

const STEPS = ["makers", "models", "scrape"] as const;
type Step = (typeof STEPS)[number];

function parseStep(raw: string | undefined): Step | "all" {
	if (!raw || raw === "all") return "all";
	if (STEPS.includes(raw as Step)) return raw as Step;
	throw new Error(`Invalid STEP "${raw}". Valid: ${STEPS.join(", ")} or "all"`);
}

const step = parseStep(env.step);

async function main() {
	console.log("GSMarena scraper starting");

	if (step === "all" || step === "makers") {
		console.log("Scraping makers...");
		await scrapeMakers();
	}

	if (step === "all" || step === "models") {
		console.log("Scraping models...");
		await scrapeModels();
	}

	console.log("\nDone");
}

main().catch(console.error);
