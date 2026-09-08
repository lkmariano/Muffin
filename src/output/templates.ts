import fs from "node:fs";

const PAGE_TEMPLATE = "./templates/page.html";

export function loadPageTemplate(): string {
  return fs.readFileSync(PAGE_TEMPLATE, "utf-8");
}
