import { readFile, stat } from "node:fs/promises";
import { parse as parsePath, resolve } from "node:path";
import { cwd, exit } from "node:process";
import { UploadCache } from "./cache.ts";
import { createClient, loadConfig } from "./client.ts";
import { uploadDirectory, uploadFile } from "./upload.ts";

const DEFAULT_CACHE_FILE = ".r2-upload-cache.json";

/** Print usage info and exit. */
function printUsage() {
	console.error(`
Usage: R2_ENDPOINT=<url> R2_ACCESS_KEY_ID=<id> R2_SECRET_ACCESS_KEY=<key> \\
       R2_BUCKET=<bucket> bun run src/auxiliary/upload-to-r2.ts [options] <source-path> [prefix]

Upload a file or directory to Cloudflare R2.

Arguments:
  source-path            File or directory to upload
  prefix                 Optional key prefix (default: "")

Options:
  -j, --jobs <n>         Number of parallel uploads (default: 4)
  -c, --cache <path>     Upload tracking file to skip re-uploads (default: .r2-upload-cache.json)
  --no-cache             Disable upload tracking
  -h, --help             Show this help

Environment:
  R2_ENDPOINT            Required. R2 endpoint URL
  R2_ACCESS_KEY_ID       Required. R2 access key
  R2_SECRET_ACCESS_KEY   Required. R2 secret key
  R2_BUCKET              Required. Target bucket name
  R2_REGION              Region (default: "auto")

Examples:
  bun run src/auxiliary/upload-to-r2.ts ./data/images models/
  bun run src/auxiliary/upload-to-r2.ts -j 8 ./data/images models/
  bun run src/auxiliary/upload-to-r2.ts -c uploads.json ./data/images models/
  bun run src/auxiliary/upload-to-r2.ts --no-cache ./data/images models/
  bun run src/auxiliary/upload-to-r2.ts ./data/devices.db backups/
`);
	exit(1);
}

/** Parse flags from argv, return remaining positional args. */
function parseArgs(argv: string[]): {
	jobs: number;
	cache: string | null;
	positionals: string[];
} {
	let jobs = 4;
	let cache: string | null = DEFAULT_CACHE_FILE;
	const positionals: string[] = [];

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;

		if (arg === "--jobs" || arg === "-j") {
			const next = argv[++i];
			if (!next) {
				console.error("Error: --jobs requires a number");
				exit(1);
			}
			jobs = Number(next);
			if (!Number.isInteger(jobs) || jobs < 1) {
				console.error("Error: --jobs must be a positive integer");
				exit(1);
			}
		} else if (arg === "--cache" || arg === "-c") {
			const next = argv[++i];
			if (!next) {
				console.error("Error: --cache requires a path");
				exit(1);
			}
			cache = next;
		} else if (arg === "--no-cache") {
			cache = null;
		} else {
			positionals.push(arg);
		}
	}

	return { jobs, cache, positionals };
}

/** Entry point — parse args, load config, upload. */
export async function main() {
	const argv = process.argv.slice(2);

	if (argv.length < 1 || argv[0] === "--help" || argv[0] === "-h") {
		printUsage();
	}

	const { jobs, cache: cachePath, positionals } = parseArgs(argv);

	if (positionals.length < 1) {
		printUsage();
	}

	const rawSource = positionals[0]!;
	const prefix = positionals[1] ?? "";
	const sourcePath = resolve(cwd(), rawSource);

	const config = loadConfig();
	const client = createClient(config);

	const cache = cachePath ? new UploadCache(cachePath) : null;
	if (cache) {
		await cache.load();
		console.log(`Cache: ${cachePath}`);
	}

	const sourceStat = await stat(sourcePath);

	if (sourceStat.isFile()) {
		const fileName = parsePath(sourcePath).base;
		const key = `${prefix}${fileName}`;

		if (cache?.has(key)) {
			console.log(`Skipping (already uploaded): ${key}`);
			return;
		}

		console.log(`Uploading file: ${sourcePath}`);
		console.log(`  → s3://${config.bucket}/${key}`);
		await uploadFile(client, config.bucket, sourcePath, key);
		cache?.add(key);
		await cache?.flush();
		console.log("  ✓ done");
	} else if (sourceStat.isDirectory()) {
		console.log(`Uploading directory: ${sourcePath}`);
		console.log(`  → s3://${config.bucket}/${prefix}*`);
		const { fileCount } = await uploadDirectory(
			client,
			config.bucket,
			sourcePath,
			prefix,
			jobs,
			cache,
		);
		console.log(`  ✓ ${fileCount} files uploaded (concurrency: ${jobs})`);
	} else {
		console.error(`Error: not a file or directory: ${sourcePath}`);
		exit(1);
	}
}
