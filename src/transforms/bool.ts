export function parseCardSlot(raw: string): string {
  if (!raw) return raw;
  const lower = raw.toLowerCase().trim();
  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  return raw;
}
