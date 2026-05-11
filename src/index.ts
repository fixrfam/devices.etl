import ora from "ora";
import { env } from "./env";
import { scrapeDevices } from "./scrapers/device";
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
	if (step === "all" || step === "makers") {
		const spinner = ora("Scraping makers...").start();
		const makers = await scrapeMakers();
		spinner.succeed(`${makers.length} makers scraped`);
	}

	if (step === "all" || step === "models") {
		const spinner = ora().start();
		const count = await scrapeModels(spinner);
		spinner.succeed(`${count} makers processed for models`);
	}

	if (step === "all" || step === "scrape") {
		const spinner = ora("Scraping device specs...").start();
		const count = await scrapeDevices(spinner);
		spinner.succeed(`${count} devices scraped`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
