import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ProxyConfig {
	host: string;
	port: number;
	auth?: { username: string; password: string };
}

let proxies: ProxyConfig[] = [];
let loaded = false;

function parseProxyLine(line: string): ProxyConfig {
	const parts = line.trim().split(":");
	if (parts.length < 2) {
		throw new Error(`Invalid proxy format: ${line}`);
	}

	const host = parts[0];
	const port = Number(parts[1]);

	if (!host || Number.isNaN(port)) {
		throw new Error(`Invalid proxy format: ${line}`);
	}

	const result: ProxyConfig = { host, port };

	if (parts.length >= 4) {
		result.auth = {
			username: String(parts[2]),
			password: parts.slice(3).join(":"),
		};
	}

	return result;
}

export function loadProxies(filePath: string): void {
	const path = resolve(process.cwd(), filePath);

	if (!existsSync(path)) {
		proxies = [];
		loaded = true;
		return;
	}

	const content = readFileSync(path, "utf-8");
	const lines = content.trim().split("\n").filter(Boolean);
	proxies = lines.map(parseProxyLine);
	loaded = true;
}

export function getRandomProxy(): ProxyConfig | undefined {
	if (!loaded || proxies.length === 0) return undefined;
	return proxies[Math.floor(Math.random() * proxies.length)];
}

export function proxyUrl(proxy: ProxyConfig): string {
	const { host, port, auth } = proxy;
	if (auth) {
		const encUser = encodeURIComponent(auth.username);
		const encPass = encodeURIComponent(auth.password);
		return `http://${encUser}:${encPass}@${host}:${port}`;
	}
	return `http://${host}:${port}`;
}

export function getProxyCount(): number {
	return proxies.length;
}
