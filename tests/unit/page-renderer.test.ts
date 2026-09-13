import { describe, expect, it } from "vitest";
import { renderPage, type RenderablePage } from "../../src/rendering/page.js";

const TEMPLATE = `<!doctype html>
<title>{{TITLE}}</title>
<body {{BODY_ATTRS}}></body>
{{CSS}} {{THEME_CSS}}
{{NAV}}
{{PAGE_META}}
{{BACKLINKS}}
{{CONTENT}}`;

// CHANGED: fixture now carries a slug so the renderer can build the body attrs.
const page: RenderablePage = {
  slug: "my-page",
  title: "My Page",
  content: "<p>hello</p>",
  metadata: { frontmatter: {}, pageType: "note", updated: "2026-01-01" },
};

describe("renderPage", () => {
  it("fills every template token", () => {
    const html = renderPage(page, TEMPLATE, "<nav></nav>");

    expect(html).toContain("<title>My Page</title>");
    expect(html).toContain('/styles.css /theme.css');
    expect(html).toContain("<nav></nav>");
    expect(html).toContain("<p>hello</p>");
    expect(html).toContain("Updated 2026-01-01");
    // CHANGED: the body attributes carry pageType + slug for scoped CSS.
    expect(html).toContain('<body data-page-type="note" data-slug="my-page"></body>');
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
      metadata: { ...page.metadata, status: "published" },
      backlinks: [{ title: "Other", href: "/Other.html" }],
    };

    const html = renderPage(withBacklinks, TEMPLATE, "");

    expect(html).toContain('<span class="page-status">published</span>');
    expect(html).toContain('<li><a href="/Other.html">Other</a></li>');
    expect(html).toContain("Backlinks");
  });

  // CHANGED: a non-default pageType must flow into the body attribute for scoped CSS.
  it("renders the home page type on the body", () => {
    const homePage: RenderablePage = {
      ...page,
      metadata: { ...page.metadata, pageType: "home" },
    };

    const html = renderPage(homePage, TEMPLATE, "");

    expect(html).toContain('<body data-page-type="home" data-slug="my-page"></body>');
  });
});