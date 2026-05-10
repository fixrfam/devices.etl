const BLOCK_SIGNALS = [
	"captcha",
	"access denied",
	"cf-browser-verification",
	"just a moment...",
	"checking your browser",
];

export function isBlocked(html: string): boolean {
	if (html.length < 500) return true;
	const lower = html.toLowerCase();
	return BLOCK_SIGNALS.some((s) => lower.includes(s));
}
