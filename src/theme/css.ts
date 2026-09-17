export type ColorTokens = {
  text: string;
  muted: string;
  background: string;
  link: string;
  border: string;
  accent: string;
  code: string;
  codeBackground: string;
  codeBorder: string;
};

export type TypographySizeTokens = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
};

export type TypographyTokens = {
  body: string;
  heading: string;
  mono: string;
  baseSize: string;
  lineHeight: string;
  weight: string;
  headingWeight: string;
  sizes: TypographySizeTokens;
};

export type SpacingTokenScale = {
  "1": string;
  "2": string;
  "3": string;
  "4": string;
  "5": string;
  "6": string;
  "7": string;
  "8": string;
  "9": string;
  "10": string;
  "11": string;
};

export type LayoutTokens = {
  contentWidth: string;
  mainWidth: string;
  navWidth: string;
  asideWidth: string;
  sidebarInset: string;
};

export type RadiusTokens = {
  sm: string;
  md: string;
};

/**
 * The full normalized theme-token set.
 *
 * Extension seam: typed component token groups (nav, explorer, callout, ...)
 * join here later as new groups and get one entry in THEME_TOKEN_GROUPS below.
 * They follow the same `--group-key` CSS-variable convention; no component
 * groups are defined yet.
 */
export type ThemeTokens = {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokenScale;
  layout: LayoutTokens;
  radius: RadiusTokens;
};

export type ThemeVars = Record<string, string>;

type TokenGroupDescriptor = {
  group: keyof ThemeTokens;
  prefix: string;
  /** Nested scale inside the group, flattened with its own prefix. */
  nested?: string;
  nestedPrefix?: string;
};

export const THEME_TOKEN_GROUPS: TokenGroupDescriptor[] = [
  { group: "colors", prefix: "color" },
  {
    group: "typography",
    prefix: "typography",
    nested: "sizes",
    nestedPrefix: "typography-size",
  },
  { group: "spacing", prefix: "spacing" },
  { group: "layout", prefix: "layout" },
  { group: "radius", prefix: "radius" },
];

function kebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function flattenTokensToVars(tokens: ThemeTokens): ThemeVars {
  const vars: ThemeVars = {};

  for (const descriptor of THEME_TOKEN_GROUPS) {
    const group = tokens[descriptor.group];
    for (const [key, value] of Object.entries(group)) {
      if (descriptor.nested && key === descriptor.nested && isNestedScale(value)) {
        for (const [innerKey, innerValue] of Object.entries(value)) {
          if (typeof innerValue === "string") {
            vars[`${descriptor.nestedPrefix}-${kebabCase(innerKey)}`] = innerValue;
          }
        }
      } else if (typeof value === "string") {
        vars[`${descriptor.prefix}-${kebabCase(key)}`] = value;
      }
    }
  }

  return vars;
}

function isNestedScale(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function varsToCssBlock(vars: ThemeVars): string {
  const lines = Object.entries(vars).map(
    ([key, value]) => `  --${key}: ${value};`
  );

  return `:root {\n${lines.join("\n")}\n}\n`;
}

/**
 * Extracts the primary font family name from a CSS font-family stack,
 * e.g. "'Lora', Georgia, serif" -> "Lora". Google Fonts URLs need a bare
 * family name, not the full fallback chain stored in config.
 */
function extractPrimaryFontFamily(fontStack: string): string {
  const firstSegment = fontStack.split(",")[0] ?? fontStack;
  return firstSegment.trim().replace(/^['"]|['"]$/g, "");
}

const GENERIC_FONT_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "roboto",
  "helvetica",
  "helvetica neue",
  "arial",
  "georgia",
  "times new roman",
  "trebuchet ms",
  "verdana",
  "tahoma",
  "courier new",
  "consolas",
  "menlo",
  "monaco",
  "liberation mono",
  "sf mono",
  "sfmono-regular",
]);

function isGenericFontFamily(family: string): boolean {
  return GENERIC_FONT_FAMILIES.has(family.toLowerCase());
}

export function generateFontImport(tokens: ThemeTokens): string {
  const families = [
    tokens.typography.body,
    tokens.typography.heading,
    tokens.typography.mono,
  ]
    .map(extractPrimaryFontFamily)
    .filter((family) => !isGenericFontFamily(family))
    .filter((family, index, all) => all.indexOf(family) === index);

  if (families.length === 0) {
    return "";
  }

  const familyParams = families
    .map((family) => `family=${family.replace(/\s+/g, "+")}:wght@400;500;600;700`)
    .join("&");

  return `@import url('https://fonts.googleapis.com/css2?${familyParams}&display=swap');\n`;
}

export function generateThemeCss(tokens: ThemeTokens): string {
  const fontImport = generateFontImport(tokens);
  const vars = flattenTokensToVars(tokens);
  const cssBlock = varsToCssBlock(vars);
  return `${fontImport}${fontImport ? "\n" : ""}${cssBlock}`;
}