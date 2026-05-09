export const env = {
  gsmarenaBaseUrl: process.env.GSMARENA_BASE_URL,
  gsmarenaMakersUrl: process.env.GSMARENA_MAKERS_PAGE_URL,
  requestDelayMs: Number(process.env.REQUEST_DELAY_MS),
  brandsToScrape:
    process.env.BRANDS_TO_SCRAPE?.split(",").filter(Boolean) ?? [],
  imagesDir: process.env.IMAGES_DIR,
} as const;
