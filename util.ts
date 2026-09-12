import path from "node:path";

export function getSlug(filePath: string): string {
  const rawSlug = path.basename(filePath, ".md");
  return rawSlug.toLowerCase().replace(/[\s_]+/g, "-");
}

export function getTitle(filePath: string): string {
  return path.basename(filePath, ".md");
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toHtmlPath(relPath: string): string {
  return relPath.replace(/\\/g, "/").replace(/\.md$/, ".html");
}