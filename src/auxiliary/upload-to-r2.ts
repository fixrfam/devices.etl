import { main } from "./r2/index.ts";

main().catch((err) => {
	console.error("Upload failed:", err);
	process.exit(1);
});
