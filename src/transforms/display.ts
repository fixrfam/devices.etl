export function parseDisplaySizeInches(raw: string): number | null {
	if (!raw) return null;
	const match = raw.match(/([\d.]+)\s*inches/i);
	if (!match?.[1]) return null;
	return parseFloat(match[1]);
}

export function parseDisplayResolution(raw: string): {
	width: number | null;
	height: number | null;
	ppi: number | null;
	ratio: string | null;
} {
	if (!raw) return { width: null, height: null, ppi: null, ratio: null };

	const resMatch = raw.match(/(\d+)\s*x\s*(\d+)/i);
	const ppiMatch = raw.match(/~?(\d+)\s*ppi/i);
	const ratioMatch = raw.match(/(\d+\.?\d*):(\d+)/);

	return {
		width: resMatch?.[1] ? parseInt(resMatch[1], 10) : null,
		height: resMatch?.[2] ? parseInt(resMatch[2], 10) : null,
		ppi: ppiMatch?.[1] ? parseInt(ppiMatch[1], 10) : null,
		ratio:
			ratioMatch?.[1] && ratioMatch[2]
				? `${ratioMatch[1]}:${ratioMatch[2]}`
				: null,
	};
}
