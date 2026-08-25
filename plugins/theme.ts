import fs from "fs";

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

export function loadThemeVars(path: string): string {
  const raw = fs.readFileSync(path, "utf-8");
  const config = JSON.parse(raw) as ThemeConfig;
  const vars = flattenConfigToVars(config);
  return varsToCssBlock(vars);
}