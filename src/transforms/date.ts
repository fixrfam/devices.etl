import { format, parse } from "date-fns";

export function parseAnnounced(raw: string): string {
  if (!raw) return raw;
  try {
    const date = parse(raw, "yyyy, MMMM dd", new Date());
    if (isNaN(date.getTime())) return raw;
    return format(date, "yyyy-MM-dd");
  } catch {
    return raw;
  }
}

export function parseReleasedFromStatus(raw: string): string | null {
  if (!raw) return null;
  const match = raw.match(
    /Released\s+(?:(\w+)\s+(\d+),\s+(\d{4})|(\d{4}),\s+(\w+)\s+(\d+))/i,
  );
  if (!match) return null;
  try {
    const month = match[1] ?? match[5];
    const day = match[2] ?? match[6];
    const year = match[3] ?? match[4];
    if (!month || !day || !year) return null;
    const date = parse(
      `${month} ${day}, ${year}`,
      "MMMM dd, yyyy",
      new Date(),
    );
    if (isNaN(date.getTime())) return null;
    return format(date, "yyyy-MM-dd");
  } catch {
    return null;
  }
}
