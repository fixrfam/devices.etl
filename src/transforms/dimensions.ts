export function parseDimensions(raw: string): {
  width: number | null;
  height: number | null;
  thickness: number | null;
} {
  if (!raw) return { width: null, height: null, thickness: null };
  const match = raw.match(
    /([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)\s*mm/i,
  );
  if (!match) return { width: null, height: null, thickness: null };
  return {
    width: match[1] ? parseFloat(match[1]) : null,
    height: match[2] ? parseFloat(match[2]) : null,
    thickness: match[3] ? parseFloat(match[3]) : null,
  };
}
