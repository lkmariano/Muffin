import { describe, expect, it } from "vitest";
import { renderPage, type RenderablePage } from "../../src/rendering/page.js";

const TEMPLATE = `<!doctype html>
<title>{{TITLE}}</title>
{{CSS}} {{THEME_CSS}}
{{NAV}}
{{PAGE_META}}
{{BACKLINKS}}
{{CONTENT}}`;

const page: RenderablePage = {
  title: "My Page",
  content: "<p>hello</p>",
  updated: "2026-01-01",
};

describe("renderPage", () => {
  it("fills every template token", () => {
    const html = renderPage(page, TEMPLATE, "<nav></nav>");

    expect(html).toContain("<title>My Page</title>");
    expect(html).toContain("/styles.css /theme.css");
    expect(html).toContain("<nav></nav>");
    expect(html).toContain("<p>hello</p>");
    expect(html).toContain("Updated 2026-01-01");
    expect(html).not.toContain("{{");
  });

  it("omits the backlinks block when there are no backlinks", () => {
    const html = renderPage(page, TEMPLATE, "");

    expect(html).not.toContain("Backlinks");
    expect(html).not.toContain("<ul>");
  });

  it("renders status and backlinks when present", () => {
    const withBacklinks: RenderablePage = {
      ...page,
      status: "published",
      backlinks: [{ title: "Other", href: "/Other.html" }],
    };

    const html = renderPage(withBacklinks, TEMPLATE, "");

    expect(html).toContain('<span class="page-status">published</span>');
    expect(html).toContain('<li><a href="/Other.html">Other</a></li>');
    expect(html).toContain("Backlinks");
  });
});