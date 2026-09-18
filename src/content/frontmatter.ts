export function normalizeTags(raw: unknown): string[] {
  if (typeof raw === "string") {
    return raw.length > 0 ? [raw] : [];
  }
  if (Array.isArray(raw)) {
    return raw.filter(
      (tag): tag is string => typeof tag === "string" && tag.length > 0,
    );
  }
  return [];
}