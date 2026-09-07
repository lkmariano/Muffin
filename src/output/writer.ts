import fs from "node:fs";
import path from "node:path";
import { generateThemeCss } from "../../plugins/theme.js";
import { loadThemeConfig } from "../theme/config.js";
import { renderPage } from "../rendering/page.js";

export interface OutputPage {
  path: string;
  title: string;
  content: string;
  status?: string;
  updated: string;
  backlinks?: Array<{ title: string; href: string }>;
}

const PAGE_TEMPLATE = "./templates/page.html";

export function writePages(
  pages: OutputPage[],
  explorerHtml: string,
) {
  const template = fs.readFileSync(PAGE_TEMPLATE, "utf-8");
  for (const page of pages) {
    const renderedContent = renderPage(page, template, explorerHtml);
    const relativePath = path.relative("./content", page.path);
    const outputPath = path.join("./muffin", relativePath.replace(/\.md$/, ".html"));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, renderedContent, "utf-8");
  }
}

export function writeStaticAssets() {
  fs.copyFileSync("./templates/styles.css", "./muffin/styles.css");
  const themeConfig = loadThemeConfig("./muffin.config.json");
  fs.writeFileSync("./muffin/theme.css", generateThemeCss(themeConfig), "utf-8");
  fs.copyFileSync("./muffin/projects.html", "./muffin/index.html");
}
