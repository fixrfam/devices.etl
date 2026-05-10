const KNOWN_CATEGORIES = [
  ["smartphone", "phone"],
  ["phone", "phone"],
  ["tablet", "tablet"],
  ["watch", "watch"],
  ["band", "band"],
] as const

export function inferModelCategory(title: string): string {
  const lower = title.toLowerCase()
  for (const [keyword, category] of KNOWN_CATEGORIES) {
    if (lower.includes(keyword)) return category
  }
  return "phone"
}
