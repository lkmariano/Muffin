import { describe, expect, it } from "vitest";
import {
  flattenConfigToVars,
  generateFontImport,
  generateThemeCss,
  varsToCssBlock,
  type ThemeConfig,
} from "../../plugins/theme.js";

const baseConfig: ThemeConfig = {
  colors: { "text-primary": "#EDE9E6", "surface-base": "#171614" },
  fonts: { body: "'Lora', Georgia, serif", mono: "'JetBrains Mono', Consolas, monospace" },
  "font-sizes": { md: "15px" },
  spacing: { "1": "2px" },
  layout: { "nav-width": "400px" },
};

describe("flattenConfigToVars", () => {
  it("flattens nested groups into group-key variable names", () => {
    const vars = flattenConfigToVars(baseConfig);
    expect(vars["colors-text-primary"]).toBe("#EDE9E6");
    expect(vars["fonts-body"]).toBe("'Lora', Georgia, serif");
    expect(vars["layout-nav-width"]).toBe("400px");
  });
});

describe("varsToCssBlock", () => {
  it("formats variables into a :root CSS block", () => {
    const css = varsToCssBlock({ "colors-link": "#9a8873" });
    expect(css).toContain(":root {");
    expect(css).toContain("  --colors-link: #9a8873;");
  });
});

describe("generateFontImport", () => {
  it("builds a Google Fonts import from font stacks", () => {
    const url = generateFontImport(baseConfig);
    expect(url).toContain("https://fonts.googleapis.com/css2");
    expect(url).toContain("family=Lora:wght@400;500;600;700");
    expect(url).toContain("family=JetBrains+Mono:wght@400;500;600;700");
    expect(url).toContain("display=swap");
  });

  it("dedupes identical font families across stacks", () => {
    const url = generateFontImport({
      ...baseConfig,
      fonts: { body: "'Lora', Georgia, serif", mono: "'Lora', serif" },
    });
    expect(url.match(/family=Lora/g) ?? []).toHaveLength(1);
  });

  it("returns an empty string when there are no fonts", () => {
    expect(generateFontImport({ ...baseConfig, fonts: {} })).toBe("");
  });
});

describe("generateThemeCss", () => {
  it("prepends the font import when fonts are configured", () => {
    const css = generateThemeCss(baseConfig);
    expect(css.startsWith("@import url(")).toBe(true);
    expect(css).toContain(":root {");
  });
});