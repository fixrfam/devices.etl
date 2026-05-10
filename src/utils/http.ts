import axios from "axios";
import { env } from "../env";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let firstRequest = true;

export const http = axios.create({
	headers: {
		"User-Agent":
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Accept-Language": "en-US,en;q=0.5",
		Referer: env.gsmarenaBaseUrl,
	},
	timeout: 15_000,
});

http.interceptors.request.use(async (config) => {
	if (firstRequest) {
		firstRequest = false;
		return config;
	}
	await delay(env.requestDelayMs);
	return config;
});
