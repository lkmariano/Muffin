import { describe, expect, it } from "vitest";
import { renderPage, type RenderablePage } from "../../src/rendering/page.js";
import type { SiteIdentity } from "../../src/config/loader.js";

const TEMPLATE = `<!doctype html>
<html lang="{{LANG}}">
<title>{{TITLE}}</title>
{{SITE_DESCRIPTION}}
<body {{BODY_ATTRS}}></body>
{{SITE_TITLE}}
{{CSS}} {{THEME_CSS}}
{{NAV}}
{{PAGE_META}}
{{BACKLINKS}}
{{CONTENT}}</html>`;

const site: SiteIdentity = { title: "Muffin", lang: "en", basePath: "" };

const page: RenderablePage = {
  slug: "my-page",
  title: "My Page",
  content: "<p>hello</p>",
  metadata: { frontmatter: {}, updated: "2026-01-01" },
};

describe("renderPage", () => {
  it("fills every template token", () => {
    const html = renderPage(page, TEMPLATE, "<nav></nav>", site);

    expect(html).toContain("<title>My Page</title>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Muffin");
    expect(html).toContain('/styles.css /theme.css');
    expect(html).toContain("<nav></nav>");
    expect(html).toContain("<p>hello</p>");
    expect(html).toContain("Updated 2026-01-01");
    expect(html).toContain('<body data-slug="my-page"></body>');
    expect(html).not.toContain("{{");
  });

  it("omits the backlinks block when there are no backlinks", () => {
    const html = renderPage(page, TEMPLATE, "", site);

    expect(html).not.toContain("Backlinks");
    expect(html).not.toContain("<ul>");
  });

  it("renders status and backlinks when present", () => {
    const withBacklinks: RenderablePage = {
      ...page,
      metadata: { ...page.metadata, status: "published" },
      backlinks: [{ title: "Other", href: "/Other.html" }],
    };

    const html = renderPage(withBacklinks, TEMPLATE, "", site);

    expect(html).toContain('<span class="page-status">published</span>');
    expect(html).toContain('<li><a href="/Other.html">Other</a></li>');
    expect(html).toContain("Backlinks");
  });

  it("uses the configured site title, lang, and description", () => {
    const custom: SiteIdentity = {
      title: "My Site",
      lang: "tl",
      description: 'A "site" description',
      basePath: "",
    };

    const html = renderPage(page, TEMPLATE, "", custom);

    expect(html).toContain('<html lang="tl">');
    expect(html).toContain("My Site");
    expect(html).toContain('<meta name="description" content="A &quot;site&quot; description" />');
  });

  it("injects the katex stylesheet link with the base path applied", () => {
    const template = '<body>{{CSS}} {{KATEX_CSS}}</body>';
    const html = renderPage(page, template, "", site, "/Muffin");

    expect(html).toContain('<body>/Muffin/styles.css /Muffin/katex/katex.min.css</body>');
    expect(html).not.toContain("{{KATEX_CSS}}");
  });

  it("injects the katex stylesheet link without a base path", () => {
    const template = '<body>{{CSS}} {{KATEX_CSS}}</body>';
    const html = renderPage(page, template, "", site);

    expect(html).toContain('<body>/styles.css /katex/katex.min.css</body>');
    expect(html).not.toContain("{{");
  });
});