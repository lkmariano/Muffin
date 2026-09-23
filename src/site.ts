export type SiteIdentity = {
  title: string;
  lang: string;
  description?: string;
  /** Site origin used for absolute URLs (RSS/sitemap). Empty/absent keeps
   *  feeds disabled; `MUFFIN_SITE_URL` overrides at build time. */
  url?: string;
};

export const SITE: SiteIdentity = {
  title: "Muffin",
  lang: "en",
};

export const CONTENT_DIRECTORY = "./content";
export const EXCLUDE_GLOBS: string[] = [];
export const HOMEPAGE = "Home";
export const OUTPUT_DIRECTORY = "./muffin";