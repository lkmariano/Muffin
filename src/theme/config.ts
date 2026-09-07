import fs from "node:fs";
import { type ThemeConfig } from "../../plugins/theme.js";

export function loadThemeConfig(configPath: string): ThemeConfig {
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as ThemeConfig;
}
