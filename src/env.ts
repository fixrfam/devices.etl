function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  gsmarenaBaseUrl: requireEnv("GSMARENA_BASE_URL"),
  gsmarenaMakersUrl: requireEnv("GSMARENA_MAKERS_PAGE_URL"),
  requestDelayMs: Number(requireEnv("REQUEST_DELAY_MS")),
  makersToScrape:
    process.env.MAKERS_TO_SCRAPE?.split(",").filter(Boolean) ?? [],
  imagesDir: process.env.IMAGES_DIR,
} as const;
