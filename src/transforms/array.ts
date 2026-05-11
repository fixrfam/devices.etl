export function splitIntoArray(
  raw: string,
  delimiter: string | RegExp,
): string {
  if (!raw) return raw;
  const parts = raw
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return raw;
  return JSON.stringify(parts);
}
