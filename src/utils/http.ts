import http from "node:http";
import https from "node:https";
import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import chalk from "chalk";
import { HttpsProxyAgent } from "https-proxy-agent";
import { env } from "../env";
import {
	getProxyCount,
	getRandomProxy,
	loadProxies,
	type ProxyConfig,
	proxyUrl,
} from "./proxy";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const nodeHttpAgent = new http.Agent({ keepAlive: true });
const nodeHttpsAgent = new https.Agent({ keepAlive: true });

let consecutive429s = 0;
export function isRateLimited(): boolean {
	return consecutive429s >= 3;
}

let lastProxy: ProxyConfig | undefined;

export function getLastProxy(): ProxyConfig | undefined {
	return lastProxy;
}

const proxyAgentCache = new Map<string, HttpsProxyAgent<string>>();

if (env.proxyFilePath) {
	loadProxies(env.proxyFilePath);
	const proxyCount = getProxyCount();
	if (proxyCount > 0) {
		console.log(`Loaded ${proxyCount} proxies from ${env.proxyFilePath}`);
	} else {
		console.log(`  ${chalk.dim("─")} No proxies loaded, running without proxy`);
	}
}

const client = axios.create({
	headers: {
		"User-Agent":
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
		Accept:
			"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
		"Accept-Language": "en-US,en;q=0.9",
		Connection: "keep-alive",
		"Cache-Control": "max-age=0",
	},
	timeout: 15_000,
});

let firstRequest = true;

client.interceptors.request.use(async (config) => {
	if (firstRequest) {
		firstRequest = false;
	} else {
		const jitter = env.requestDelayMs * (0.5 + Math.random() * 0.5);
		await delay(jitter);
	}

	if (config.url) {
		try {
			const origin = new URL(config.url, config.baseURL).origin;
			config.headers.set("Referer", origin + "/");
		} catch {}
	}

	const proxy = getRandomProxy();
	if (proxy) {
		lastProxy = proxy;
		const url = proxyUrl(proxy);
		if (!proxyAgentCache.has(url)) {
			proxyAgentCache.set(url, new HttpsProxyAgent(url));
		}
		config.httpsAgent = proxyAgentCache.get(url);
	} else {
		config.httpAgent = nodeHttpAgent;
		config.httpsAgent = nodeHttpsAgent;
	}

	return config;
});

interface RetryConfig extends AxiosRequestConfig {
	_retryCount?: number;
}

client.interceptors.response.use(
	(res) => {
		consecutive429s = 0;
		return res;
	},
	async (error) => {
		const config = error.config as RetryConfig | undefined;
		if (!config) return Promise.reject(error);

		const status = error.response?.status;
		const isRetryable =
			status === 429 ||
			(status && status >= 500 && status < 600) ||
			error.code === "ECONNRESET" ||
			error.code === "ECONNABORTED" ||
			error.message?.includes("timeout");

		if (!isRetryable) return Promise.reject(error);

		if (status === 429) {
			consecutive429s++;
			if (consecutive429s >= 3) {
				return Promise.reject(
					new Error("Rate limited - aborting (3 consecutive 429s)"),
				);
			}
		}

		config._retryCount = (config._retryCount || 0) + 1;
		if (config._retryCount > 3) return Promise.reject(error);

		const backoff = 1000 * 2 ** config._retryCount + Math.random() * 1000;
		await delay(backoff);
		return client(config);
	},
);

export { client as http };
