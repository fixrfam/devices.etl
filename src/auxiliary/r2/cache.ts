import { readFile, writeFile } from "node:fs/promises";

const FLUSH_INTERVAL = 25;

/**
 * Tracks successfully uploaded keys so uploads are skipped on re-runs.
 * Persists progress incrementally to a JSON file.
 */
export class UploadCache {
	private uploaded: Set<string>;
	private pending: string[];
	private filePath: string;
	private flushAfter: number;

	constructor(filePath: string, flushAfter: number = FLUSH_INTERVAL) {
		this.uploaded = new Set();
		this.pending = [];
		this.filePath = filePath;
		this.flushAfter = flushAfter;
	}

	/** Load existing cache from disk. */
	async load(): Promise<void> {
		try {
			const raw = await readFile(this.filePath, "utf-8");
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				for (const key of parsed) {
					this.uploaded.add(key);
				}
			}
		} catch {
			// File doesn't exist yet or is corrupted — start fresh
		}
	}

	/** Check if a key was already uploaded. */
	has(key: string): boolean {
		return this.uploaded.has(key);
	}

	/** Mark a key as uploaded (batched in memory until flush). */
	add(key: string): void {
		this.pending.push(key);
		this.uploaded.add(key);
	}

	/** Flush pending keys to disk. */
	async flush(): Promise<void> {
		if (this.pending.length === 0) return;

		let existing: string[] = [];
		try {
			const raw = await readFile(this.filePath, "utf-8");
			existing = JSON.parse(raw);
		} catch {
			// start fresh
		}

		const merged = [...existing, ...this.pending];
		await writeFile(this.filePath, JSON.stringify(merged), "utf-8");
		this.pending = [];
	}

	/** Flush if the pending buffer is full. */
	async maybeFlush(): Promise<void> {
		if (this.pending.length >= this.flushAfter) {
			await this.flush();
		}
	}
}
