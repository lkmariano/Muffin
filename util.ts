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

const RFC822_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const RFC822_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Renders an ISO `YYYY-MM-DD` date as an RFC-822 pubDate (e.g. "Mon, 21 Sep
 *  2026 00:00:00 +0000") using UTC parts so no timezone shifting occurs.
 *  Falls back to the raw value when the date cannot be parsed. */
export function formatRfc822(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return iso;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return iso;
  const dayName = RFC822_DAY_NAMES[date.getUTCDay()]!;
  const monthName = RFC822_MONTH_NAMES[month - 1]!;
  return `${dayName}, ${String(day).padStart(2, "0")} ${monthName} ${year} 00:00:00 +0000`;
}

export function toHtmlPath(relPath: string): string {
  return relPath.replace(/\\/g, "/").replace(/\.md$/, ".html");
}