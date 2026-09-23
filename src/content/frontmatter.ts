import { getTitle } from "../../util.js";

export function normalizeTags(raw: unknown): string[] {
  return normalizeStringList(raw, (tag) => tag.replace(/^#/, ""));
}

/** Coerces a YAML string or string list into a trimmed, deduplicated array.
 *  Each kept value is passed through `transform` (dedupe runs after the
 *  transform); non-string entries and empty values are dropped; absent/other
 *  shapes become `[]`. */
function normalizeStringList(
  raw: unknown,
  transform: (value: string) => string,
): string[] {
  const list =
    typeof raw === "string"
      ? raw.length > 0
        ? [raw]
        : []
      : Array.isArray(raw)
        ? raw.filter((value): value is string => typeof value === "string")
        : [];

  const seen = new Set<string>();
  const values: string[] = [];
  for (const value of list) {
    const cleaned = transform(value.trim());
    if (cleaned === "" || seen.has(cleaned)) continue;
    seen.add(cleaned);
    values.push(cleaned);
  }
  return values;
}

/** Obsidian's `aliases:` frontmatter field — a display name (YAML string or
 *  list) other notes can wikilink to. Values are trimmed and deduplicated;
 *  aliases are names, so unlike tags no leading `#` is stripped. */
export function normalizeAliases(frontmatter: Record<string, unknown>): string[] {
  return normalizeStringList(frontmatter.aliases, (alias) => alias);
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