export function withBasePath(
  urlPath: string,
  basePath = process.env.MUFFIN_BASE_PATH ?? "",
): string {
  const prefix = basePath.replace(/\/$/, "");
  if (!prefix) {
    return urlPath;
  }
  return `${prefix}${urlPath}`;
}

/** Resolves the site origin for absolute URLs (RSS/sitemap). Reads
 *  `MUFFIN_SITE_URL` at call time and falls back to the supplied fallback;
 *  a trailing slash is stripped so `origin + path` composes cleanly. */
export function resolveSiteUrl(
  fallback: string,
  siteUrl = process.env.MUFFIN_SITE_URL ?? "",
): string {
  const url = siteUrl || fallback;
  return url.replace(/\/+$/, "");
}