import fs from "node:fs";
import type { ThemeConfig } from "../theme/css.js";

export type SiteConfig = {
  homepage?: string;
  theme: ThemeConfig;
};

export function loadConfig(configPath: string): SiteConfig {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8")) as ThemeConfig & {
    homepage?: string;
  };
  const { homepage, ...theme } = raw;
  return homepage === undefined ? { theme } : { homepage, theme };
}