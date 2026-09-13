export type Backlink = { title: string; href: string };

// CHANGED: dropped "photo" (future feature); added "home" so the homepage is its own type.
export type PageType = "portfolio" | "note" | "home";

export type PageMetadata = {
  frontmatter: Record<string, unknown>;
  status?: string;
  updated: string;
  pageType: PageType;
};

// CHANGED: added `slug` so the renderer receives prepared data (data-slug attribute)
// instead of deriving it from a path at render time.
export type Page = {
  path: string;
  slug: string;
  title: string;
  metadata: PageMetadata;
  content: string;
  backlinks?: Backlink[];
};

// ADDED: pure resolver — reads frontmatter.type, falls back to "note" for
// missing/unknown/non-string values so pages degrade gracefully.
export function resolvePageType(frontmatter: Record<string, unknown>): PageType {
  if (typeof frontmatter.type === "string") {
    const value = frontmatter.type.toLowerCase();
    if (value === "portfolio" || value === "home" || value === "note") {
      return value;
    }
  }
  return "note";
}