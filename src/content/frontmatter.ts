import { getTitle } from "../../util.js";

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

// Page title precedence: an explicit non-empty string frontmatter `title`
// wins; empty or non-string values fall back to the filename-derived title.
export function resolvePageTitle(
  frontmatter: Record<string, unknown>,
  filePath: string,
): string {
  const raw = frontmatter.title;
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  return getTitle(filePath);
}