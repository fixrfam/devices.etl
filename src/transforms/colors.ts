const COLOR_HEX_MAP: Record<string, string> = {
  black: "#171717",
  white: "#FAFAFA",
  silver: "#D4D4D4",
  gray: "#737373",
  grey: "#737373",
  blue: "#3B82F6",
  navy: "#1E3A5F",
  "sky blue": "#87CEEB",
  sky: "#38BDF8",
  teal: "#14B8A6",
  green: "#22C55E",
  mint: "#A7F3D0",
  lime: "#BEF264",
  red: "#EF4444",
  rose: "#F43F5E",
  pink: "#F472B6",
  coral: "#FF7F7F",
  purple: "#A855F7",
  violet: "#8B5CF6",
  lavender: "#D8B4FE",
  yellow: "#EAB308",
  gold: "#F59E0B",
  orange: "#F97316",
  amber: "#D97706",
  brown: "#92400E",
  bronze: "#9A7B4F",
  coffee: "#6F4E37",
  graphite: "#4A4A4A",
  titanium: "#8A8A8A",
  starlight: "#FAF5EB",
  midnight: "#1A1A2E",
  "space black": "#2C2C2E",
  "space gray": "#4A4A4A",
  "cloud white": "#F5F5F5",
  "light gold": "#FAD7A0",
  "deep purple": "#5B2C6F",
  "alpine green": "#1E8449",
  "sierra blue": "#85C1E9",
  "rose gold": "#F5B7B1",
  "midnight green": "#0E6655",
  cream: "#FEF3C7",
  "light pink": "#FBCFE8",
  "light purple": "#E9D5FF",
  "light blue": "#BFDBFE",
  "light green": "#BBF7D0",
  "light yellow": "#FEF08A",
  "light orange": "#FED7AA",
  "dark blue": "#1E3A8A",
  "dark green": "#065F46",
  "dark gray": "#374151",
  "dark grey": "#374151",
  "dark purple": "#4C1D95",
  "dark red": "#991B1B",
};

export function parseColors(raw: string): string {
  if (!raw) return raw;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return raw;
  return JSON.stringify(parts);
}

export function extractHexCodes(raw: string): string | null {
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const hexes: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    const exact = COLOR_HEX_MAP[lower];
    if (exact) {
      hexes.push(exact);
      continue;
    }
    const fuzzy = Object.entries(COLOR_HEX_MAP).find(([name]) =>
      lower.includes(name),
    );
    if (fuzzy) hexes.push(fuzzy[1]);
  }

  if (hexes.length === 0) return null;
  return JSON.stringify(hexes);
}
