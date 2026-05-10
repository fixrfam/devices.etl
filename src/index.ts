import { scrapeMakers } from "./scrapers/makers"

async function main() {
  console.log("Starting GSMarena scraper...")
  await scrapeMakers()
  console.log("Done!")
}

main().catch(console.error)
