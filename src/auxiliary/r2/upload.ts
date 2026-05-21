import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import type { UploadCache } from "./cache.ts";
import { guessContentType } from "./mime.ts";
import { asyncPool } from "./pool.ts";

/** Upload a single file to R2. */
export async function uploadFile(
	client: S3Client,
	bucket: string,
	filePath: string,
	key: string,
): Promise<void> {
	const content = await readFile(filePath);
	const contentType = guessContentType(filePath);

	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		Body: content,
		ContentType: contentType,
	});

	await client.send(command);
}

type FileEntry = { filePath: string; key: string };

/** Walk a directory recursively and collect all files with their keys. */
export async function collectFiles(
	dirPath: string,
	prefix: string,
): Promise<FileEntry[]> {
	const entries = await readdir(dirPath, { withFileTypes: true });
	const files: FileEntry[] = [];

	for (const entry of entries) {
		const fullPath = resolve(dirPath, entry.name);

		if (entry.isDirectory()) {
			const sub = await collectFiles(fullPath, `${prefix}${entry.name}/`);
			files.push(...sub);
		} else if (entry.isFile()) {
			files.push({ filePath: fullPath, key: `${prefix}${entry.name}` });
		}
	}

	return files;
}

/** Recursively walk and upload a directory to R2 with concurrency control. */
export async function uploadDirectory(
	client: S3Client,
	bucket: string,
	dirPath: string,
	prefix: string,
	jobs: number,
	cache: UploadCache | null,
): Promise<{ fileCount: number }> {
	const allFiles = await collectFiles(dirPath, prefix);
	const toUpload = cache ? allFiles.filter((f) => !cache.has(f.key)) : allFiles;
	const skipped = allFiles.length - toUpload.length;

	if (skipped > 0) {
		console.log(`  (${skipped} already uploaded, skipping)`);
	}

	await asyncPool(jobs, toUpload, async ({ filePath, key }) => {
		await uploadFile(client, bucket, filePath, key);
		cache?.add(key);
		await cache?.maybeFlush();
		console.log(`  ✓ ${key}`);
	});

	await cache?.flush();
	return { fileCount: toUpload.length };
}
