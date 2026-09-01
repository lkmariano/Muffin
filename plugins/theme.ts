export type ThemeConfig = {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  "font-sizes": Record<string, string>;
  spacing: Record<string, string>;
  layout: Record<string, string>;
};

export type ThemeVars = Record<string, string>;

export function flattenConfigToVars(config: ThemeConfig): ThemeVars {
  const vars: ThemeVars = {};

  for (const [groupKey, group] of Object.entries(config)) {
    for (const [innerKey, value] of Object.entries(group)) {
      vars[`${groupKey}-${innerKey}`] = value;
    }
  }

  return vars;
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

export function generateFontImport(config: ThemeConfig): string {
  const families = Object.values(config.fonts)
    .map(extractPrimaryFontFamily)
    .filter((family, index, all) => all.indexOf(family) === index);

  if (families.length === 0) {
    return "";
  }

  const familyParams = families
    .map((family) => `family=${family.replace(/\s+/g, "+")}:wght@400;500;600;700`)
    .join("&");

  return `@import url('https://fonts.googleapis.com/css2?${familyParams}&display=swap');\n`;
}


export function generateThemeCss(config: ThemeConfig): string {
  const fontImport = generateFontImport(config);
  const vars = flattenConfigToVars(config);
  const cssBlock = varsToCssBlock(vars);
  return `${fontImport}${fontImport ? "\n" : ""}${cssBlock}`;
}