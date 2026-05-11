export function parseWeightGrams(raw: string): number | null {
  if (!raw) return null;
  const match = raw.match(/([\d.]+)\s*g/i);
  if (!match || !match[1]) return null;
  return parseFloat(match[1]);
}
