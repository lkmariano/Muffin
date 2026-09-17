import { describe, expect, it } from "vitest";
import {
  flattenTokensToVars,
  generateFontImport,
  generateThemeCss,
  varsToCssBlock,
  type ThemeTokens,
} from "../../src/theme/css.js";
import { DEFAULT_THEME_TOKENS } from "../../src/theme/defaults.js";

function withTokens(overrides: Partial<ThemeTokens>): ThemeTokens {
  return {
    colors: { ...DEFAULT_THEME_TOKENS.colors, ...overrides.colors },
    typography: {
      ...DEFAULT_THEME_TOKENS.typography,
      ...overrides.typography,
      sizes: { ...DEFAULT_THEME_TOKENS.typography.sizes, ...overrides.typography?.sizes },
    },
    spacing: { ...DEFAULT_THEME_TOKENS.spacing, ...overrides.spacing },
    layout: { ...DEFAULT_THEME_TOKENS.layout, ...overrides.layout },
    radius: { ...DEFAULT_THEME_TOKENS.radius, ...overrides.radius },
  };
}

const webfontTokens = withTokens({
  typography: {
    body: "'Lora', Georgia, serif",
    heading: "'Lora', Georgia, serif",
    mono: "'JetBrains Mono', Consolas, monospace",
  },
});

describe("flattenTokensToVars", () => {
  it("flattens scalar groups into kebab-case group-prefixed variables", () => {
    const vars = flattenTokensToVars(
      withTokens({
        colors: { text: "#EDE9E6", codeBackground: "#171614" },
        layout: { sidebarInset: "180px" },
      }),
    );
    expect(vars["color-text"]).toBe("#EDE9E6");
    expect(vars["color-code-background"]).toBe("#171614");
    expect(vars["layout-sidebar-inset"]).toBe("180px");
    expect(vars["typography-base-size"]).toBe("16px");
  });

  it("flattens the typography sizes scale with its own prefix", () => {
    const vars = flattenTokensToVars(DEFAULT_THEME_TOKENS);
    expect(vars["typography-size-md"]).toBe("15px");
    expect(vars["typography-size-2xl"]).toBe("32px");
  });

  it("preserves the full spacing and layout scales", () => {
    const vars = flattenTokensToVars(DEFAULT_THEME_TOKENS);
    expect(vars["spacing-1"]).toBe("2px");
    expect(vars["spacing-11"]).toBe("48px");
    expect(vars["layout-content-width"]).toBe("800px");
    expect(vars["layout-main-width"]).toBe("900px");
    expect(vars["layout-nav-width"]).toBe("400px");
    expect(vars["layout-aside-width"]).toBe("400px");
    expect(vars["radius-sm"]).toBe("2px");
    expect(vars["radius-md"]).toBe("4px");
  });

  it("emits exactly the known token variables", () => {
    const expected = new Set([
      ...Object.keys(DEFAULT_THEME_TOKENS.colors).map((key) => `color-${kebab(key)}`),
      "typography-body",
      "typography-heading",
      "typography-mono",
      "typography-base-size",
      "typography-line-height",
      "typography-weight",
      "typography-heading-weight",
      ...[...Object.keys(DEFAULT_THEME_TOKENS.typography.sizes)].map(
        (key) => `typography-size-${kebab(key)}`,
      ),
      ...Object.keys(DEFAULT_THEME_TOKENS.spacing).map((key) => `spacing-${key}`),
      ...Object.keys(DEFAULT_THEME_TOKENS.layout).map((key) => `layout-${kebab(key)}`),
      ...Object.keys(DEFAULT_THEME_TOKENS.radius).map((key) => `radius-${kebab(key)}`),
    ]);
    const vars = flattenTokensToVars(DEFAULT_THEME_TOKENS);
    expect(new Set(Object.keys(vars))).toEqual(expected);
  });
});

describe("varsToCssBlock", () => {
  it("formats variables into a :root CSS block", () => {
    const css = varsToCssBlock({ "color-link": "#9a8873" });
    expect(css).toContain(":root {");
    expect(css).toContain("  --color-link: #9a8873;");
  });
});

describe("generateFontImport", () => {
  it("builds a Google Fonts import from font stacks, deduped", () => {
    const url = generateFontImport(webfontTokens);
    expect(url).toContain("https://fonts.googleapis.com/css2");
    expect(url).toContain("family=Lora:wght@400;500;600;700");
    expect(url).toContain("family=JetBrains+Mono:wght@400;500;600;700");
    expect(url).toContain("display=swap");
    expect(url.match(/family=Lora/g) ?? []).toHaveLength(1);
  });

  it("returns an empty string when the tokens use only system fonts", () => {
    expect(generateFontImport(DEFAULT_THEME_TOKENS)).toBe("");
  });

  it("does not import generic fallbacks mixed with a webfont", () => {
    const url = generateFontImport(
      withTokens({ typography: { body: "'Lora', Georgia, serif" } }),
    );
    expect(url).toContain("family=Lora");
    expect(url).not.toContain("family=Georgia");
  });
});

describe("generateThemeCss", () => {
  it("prepends the font import when fonts are configured", () => {
    const css = generateThemeCss(webfontTokens);
    expect(css.startsWith("@import url(")).toBe(true);
    expect(css).toContain(":root {");
  });
});

describe("DEFAULT_THEME_TOKENS", () => {
  it("defines every token group", () => {
    expect(Object.keys(DEFAULT_THEME_TOKENS)).toEqual([
      "colors",
      "typography",
      "spacing",
      "layout",
      "radius",
    ]);
  });

  it("uses system font stacks that generate no Google Fonts import", () => {
    expect(generateFontImport(DEFAULT_THEME_TOKENS)).toBe("");
  });

  it("generates the current neutral stylesheet values", () => {
    const css = generateThemeCss(DEFAULT_THEME_TOKENS);
    expect(css.startsWith("@import")).toBe(false);
    expect(css).toContain("--color-text: #1a1a1a;");
    expect(css).toContain("--color-background: #ffffff;");
    expect(css).toContain("--color-link: #1a0dab;");
    expect(css).toContain("--color-border: #e5e7eb;");
    expect(css).toContain("--typography-size-md: 15px;");
    expect(css).toContain("--spacing-10: 40px;");
    expect(css).toContain("--layout-content-width: 800px;");
    expect(css).toContain("--layout-main-width: 900px;");
    expect(css).toContain("--layout-nav-width: 400px;");
  });
});

function kebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}