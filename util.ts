import path from "path";

const slugMap: Record<string, string> = {};

export function getSlug(filePath: string): string {
  const rawSlug = path.basename(filePath, ".md");
  const rawslug = rawSlug.toLowerCase().replace(/\s+/g, '-');
  return rawslug;
}

