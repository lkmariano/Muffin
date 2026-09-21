import path from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_THEME_TOKENS } from "../theme/defaults.js";
import type {
  LayoutTokens,
  RadiusTokens,
  SpacingTokenScale,
  ThemeTokens,
  TypographyTokens,
} from "../theme/css.js";

export type SiteIdentity = {
  title: string;
  lang: string;
  description?: string;
  basePath: string;
};

export type ContentConfig = {
  directory: string;
  exclude: string[];
};

export type OutputConfig = {
  directory: string;
};

export type SiteConfig = {
  site: SiteIdentity;
  content: ContentConfig;
  theme: ThemeTokens;
  homepage?: string;
  output: OutputConfig;
};

export type MuffinConfig = {
  site?: {
    title?: string;
    description?: string;
    lang?: string;
    basePath?: string;
  };
  content?: {
    directory?: string;
    exclude?: string[];
  };
  homepage?: {
    page: string;
  };
  theme?: {
    tokens?: {
      colors?: Partial<ThemeTokens["colors"]>;
      typography?: Partial<Omit<TypographyTokens, "sizes">> & {
        sizes?: Partial<TypographyTokens["sizes"]>;
      };
      spacing?: Partial<SpacingTokenScale>;
      layout?: Partial<LayoutTokens>;
      radius?: Partial<RadiusTokens>;
    };
  };
  output?: {
    directory?: string;
  };
};

const DEFAULT_SITE_IDENTITY = {
  title: "Muffin",
  lang: "en",
} as const;

export function defineConfig(config: MuffinConfig): MuffinConfig {
  return config;
}

export type ResolveConfigDefaults = {
  /** Fallback base path (e.g. from MUFFIN_BASE_PATH) when site.basePath is unset. */
  basePath?: string;
  /** Directory that relative content/output paths resolve against. Defaults to process.cwd(). */
  baseDir?: string;
};

export function resolveConfig(raw: MuffinConfig, defaults: ResolveConfigDefaults = {}): SiteConfig {
  const baseDir = defaults.baseDir ?? process.cwd();
  const site = resolveSiteIdentity(raw.site, defaults.basePath);
  const content = resolveContent(raw.content, baseDir);
  const theme = resolveTheme(raw.theme);
  const output = resolveOutput(raw.output, baseDir);

  const homepage = isRecord(raw.homepage) && typeof raw.homepage.page === "string"
    ? raw.homepage.page
    : undefined;

  return homepage === undefined
    ? { site, content, theme, output }
    : { site, content, theme, output, homepage };
}

function resolveSiteIdentity(rawValue: unknown, fallbackBasePath?: string): SiteIdentity {
  const rawSite = isRecord(rawValue) ? rawValue : {};

  const title =
    typeof rawSite.title === "string" && rawSite.title !== ""
      ? rawSite.title
      : DEFAULT_SITE_IDENTITY.title;
  const lang =
    typeof rawSite.lang === "string" && rawSite.lang !== ""
      ? rawSite.lang
      : DEFAULT_SITE_IDENTITY.lang;
  const basePath =
    typeof rawSite.basePath === "string"
      ? rawSite.basePath
      : fallbackBasePath ?? "";
  const description = typeof rawSite.description === "string" ? rawSite.description : undefined;

  return description === undefined
    ? { title, lang, basePath }
    : { title, lang, basePath, description };
}

function resolveContent(rawValue: unknown, baseDir: string): ContentConfig {
  const rawContent = isRecord(rawValue) ? rawValue : {};

  const directory =
    typeof rawContent.directory === "string" && rawContent.directory !== ""
      ? path.resolve(baseDir, rawContent.directory)
      : path.resolve(baseDir, "./content");

  const exclude =
    Array.isArray(rawContent.exclude)
      ? rawContent.exclude.filter((entry): entry is string => typeof entry === "string")
      : [];

  return { directory, exclude };
}

function resolveOutput(rawValue: unknown, baseDir: string): OutputConfig {
  const rawOutput = isRecord(rawValue) ? rawValue : {};

  const directory =
    typeof rawOutput.directory === "string" && rawOutput.directory !== ""
      ? path.resolve(baseDir, rawOutput.directory)
      : path.resolve(baseDir, "./muffin");

  return { directory };
}

function resolveTheme(rawValue: unknown): ThemeTokens {
  const rawTheme = isRecord(rawValue) ? rawValue : {};
  const rawTokens = isRecord(rawTheme.tokens) ? rawTheme.tokens : {};

  const colors = mergeScalarGroup(
    isRecord(rawTokens.colors) ? rawTokens.colors : {},
    DEFAULT_THEME_TOKENS.colors,
  );

  const rawTypography = isRecord(rawTokens.typography) ? rawTokens.typography : {};
  const { sizes: defaultSizes, ...defaultTypography } = DEFAULT_THEME_TOKENS.typography;
  const typography: ThemeTokens["typography"] = {
    ...mergeScalarGroup(rawTypography, defaultTypography),
    sizes: mergeScalarGroup(
      isRecord(rawTypography.sizes) ? rawTypography.sizes : {},
      defaultSizes,
    ),
  };

  const spacing = mergeScalarGroup(
    isRecord(rawTokens.spacing) ? rawTokens.spacing : {},
    DEFAULT_THEME_TOKENS.spacing,
  );
  const layout = mergeScalarGroup(
    isRecord(rawTokens.layout) ? rawTokens.layout : {},
    DEFAULT_THEME_TOKENS.layout,
  );
  const radius = mergeScalarGroup(
    isRecord(rawTokens.radius) ? rawTokens.radius : {},
    DEFAULT_THEME_TOKENS.radius,
  );

  return { colors, typography, spacing, layout, radius };
}

/**
 * Deep-merges string values from `raw` over `defaults`, keyed by the typed
 * default keys. Unknown/malformed keys and non-string values are ignored, so
 * arbitrary CSS can never leak through the theming API.
 */
function mergeScalarGroup<T extends Record<string, string>>(
  raw: Record<string, unknown>,
  defaults: T,
): T {
  const merged: Record<string, string> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const value = raw[key];
    if (typeof value === "string") {
      merged[key] = value;
    }
  }
  return merged as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function loadConfig(configPath?: string): Promise<SiteConfig> {
  let raw: MuffinConfig = {};
  let baseDir: string | undefined;
  if (configPath !== undefined) {
    try {
      const resolved = path.resolve(configPath);
      baseDir = path.dirname(resolved);
      const mod = await import(pathToFileURL(resolved).href);
      const value = (mod.default ?? mod) as unknown;
      raw = isRecord(value) ? (value as MuffinConfig) : {};
    } catch {
      raw = {};
    }
  }

  const defaults: ResolveConfigDefaults = { basePath: process.env.MUFFIN_BASE_PATH ?? "" };
  if (baseDir !== undefined) {
    defaults.baseDir = baseDir;
  }
  return resolveConfig(raw, defaults);
}