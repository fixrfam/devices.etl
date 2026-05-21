import { parse as parsePath } from "node:path";

const MIME_TYPES: Record<string, string> = {
	".html": "text/html",
	".css": "text/css",
	".js": "text/javascript",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".avif": "image/avif",
	".pdf": "application/pdf",
	".txt": "text/plain",
	".csv": "text/csv",
	".xml": "text/xml",
	".zip": "application/zip",
	".gz": "application/gzip",
	".db": "application/octet-stream",
	".sqlite": "application/octet-stream",
};

/** Guess the MIME type of a file from its extension. */
export function guessContentType(filePath: string): string {
	const ext = parsePath(filePath).ext.toLowerCase();
	return MIME_TYPES[ext] ?? "application/octet-stream";
}
