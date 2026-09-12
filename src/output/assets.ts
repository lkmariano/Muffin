import fs from "node:fs";
import { generateThemeCss } from "../theme/css.js";
import type { SiteConfig } from "../config/loader.js";

export function writeStaticAssets(config: SiteConfig) {
  fs.copyFileSync("./templates/styles.css", "./muffin/styles.css");
  fs.writeFileSync("./muffin/theme.css", generateThemeCss(config.theme), "utf-8");
}