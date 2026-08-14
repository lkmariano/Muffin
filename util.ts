import path from "path";

export function getSlug(filePath: string): string {
  const rawSlug = path.basename(filePath, ".md");
  const rawslug = rawSlug.toLowerCase().replace(/[\s_]+/g, '-');
  return rawslug;
}

export function getTitle(filePath: string): string {
  return path.basename(filePath, ".md");
}