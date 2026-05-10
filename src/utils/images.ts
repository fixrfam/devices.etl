import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { http } from "./http";

export async function downloadImage(
	url: string,
	destDir: string,
	slug: string,
): Promise<string> {
	if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

	const ext = extname(new URL(url).pathname) || ".jpg";
	const destPath = `${destDir}/${slug}${ext}`;

	const { data } = await http.get(url, { responseType: "arraybuffer" });
	await writeFile(destPath, Buffer.from(data));

	return destPath;
}
