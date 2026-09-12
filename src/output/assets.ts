import fs from "node:fs";
import { generateThemeCss } from "../../plugins/theme.js";
import { loadThemeConfig } from "../theme/config.js";

export function writeStaticAssets() {
  fs.copyFileSync("./templates/styles.css", "./muffin/styles.css");
  const themeConfig = loadThemeConfig("./muffin.config.json");
  fs.writeFileSync("./muffin/theme.css", generateThemeCss(themeConfig), "utf-8");
}
