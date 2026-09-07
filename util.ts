import path from "node:path";

export function getSlug(filePath: string): string {
  const rawSlug = path.basename(filePath, ".md");
  return rawSlug.toLowerCase().replace(/[\s_]+/g, "-");
}

export function getTitle(filePath: string): string {
  return path.basename(filePath, ".md");
}