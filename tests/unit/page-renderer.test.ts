import { afterEach, describe, expect, it } from "vitest";
import { renderPage } from "../../src/rendering/page.js";
import { renderSitePage } from "../../src/presentation/renderSitePage.js";
import {
  createPresentationContext,
  type PageRenderer,
  type PresentationContext,
  type PresentationOptions,
} from "../../src/rendering/context.js";
import type { SiteIdentity } from "../../src/site.js";
import type { Page } from "../../src/domain/page.js";

const TEMPLATE = `<!doctype html>
<html lang="{{LANG}}">
<title>{{TITLE}}</title>
{{SITE_DESCRIPTION}}
<body {{BODY_ATTRS}}></body>
{{SITE_TITLE}}
{{CSS}}
{{NAV}}
{{PAGE_META}}
{{TOC}}
{{BACKLINKS}}
{{CONTENT}}</html>`;

const site: SiteIdentity = { title: "Muffin", lang: "en" };

const page: Page = {
  path: "/vault/My Page.md",
  relPath: "My Page.md",
  slug: "my-page",
  title: "My Page",
  content: "<p>hello</p>",
  metadata: { frontmatter: {}, updated: "2026-01-01", tags: [] },
  toc: [
    { depth: 1, text: "Intro", id: "intro" },
    { depth: 2, text: "Details", id: "details" },
  ],
};

function makeContext(
  pageOverrides: Partial<Page> = {},
  siteOverride: SiteIdentity = site,
  options: PresentationOptions = {},
): PresentationContext {
  return createPresentationContext({ ...page, ...pageOverrides }, siteOverride, "<nav></nav>", options);
}

const ORIGINAL_BASE_PATH = process.env.MUFFIN_BASE_PATH;

afterEach(() => {
  if (ORIGINAL_BASE_PATH === undefined) {
    delete process.env.MUFFIN_BASE_PATH;
  } else {
    process.env.MUFFIN_BASE_PATH = ORIGINAL_BASE_PATH;
  }
});

describe("renderPage", () => {
  it("fills every template token from the presentation context", () => {
    const html = renderPage(makeContext(), TEMPLATE);

    expect(html).toContain("<title>My Page</title>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Muffin");
    expect(html).toContain("/styles.css");
    expect(html).not.toContain("/theme.css");
    expect(html).not.toContain("{{THEME_CSS}}");
    expect(html).toContain("<nav></nav>");
    expect(html).toContain("<p>hello</p>");
    expect(html).toContain("Jan 1, 2026");
    expect(html).toContain('<body data-slug="my-page" data-relpath="My Page.md" data-base-path=""></body>');
    expect(html).not.toContain("{{");
  });

  it("emits data-relpath and data-base-path onto the body", () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const html = renderPage(
      makeContext({ relPath: 'notes/a"&b.md' }),
      '<body {{BODY_ATTRS}}></body>',
    );

    expect(html).toContain('data-slug="my-page"');
    expect(html).toContain('data-relpath="notes/a&quot;&amp;b.md"');
    expect(html).toContain('data-base-path="/Muffin"');
  });

  it("blanks data-base-path when no base path is configured", () => {
    delete process.env.MUFFIN_BASE_PATH;
    const html = renderPage(makeContext(), '<body {{BODY_ATTRS}}></body>');
    expect(html).toContain('data-base-path=""');
  });

  it("renders TOC entries inside a collapsible details with heading anchors", () => {
    const html = renderPage(makeContext(), TEMPLATE);

    expect(html).toContain('<div class="toc"><details open>');
    expect(html).toContain('<span class="aside-title">Table of Contents</span>');
    expect(html).toContain('class="aside-chevron"');
    expect(html).toContain('<li class="toc-item toc-depth-1"><a href="#intro">Intro</a></li>');
    expect(html).toContain('<li class="toc-item toc-depth-2"><a href="#details">Details</a></li>');
  });

  it("omits the TOC block when the page has no entries", () => {
    const html = renderPage(makeContext({ toc: [] }), TEMPLATE);
    expect(html).not.toContain("Table of Contents");
  });

  it("renders status, tags, and backlinks when present and omits empty sections", () => {
    const withBacklinks = makeContext({
      metadata: { ...page.metadata, status: "published", tags: ["a", "b"] },
      backlinks: [{ title: "Other", href: "/Other.html" }],
    });

    const present = renderPage(withBacklinks, TEMPLATE);
    expect(present).toContain('<span class="page-status">published</span>');
    expect(present).toContain('<span class="page-tags">a, b</span>');
    expect(present).toContain('<li><a href="/Other.html">Other</a></li>');
    expect(present).toContain("Backlinks");

    const absent = renderPage(makeContext(), TEMPLATE);
    expect(absent).not.toContain("Backlinks");
  });

  it("escapes user content in attributes and text", () => {
    const html = renderPage(
      makeContext({ title: 'My "Page" <3' }),
      TEMPLATE,
    );
    expect(html).toContain("<title>My \"Page\" &lt;3</title>");
  });

  it("uses the configured site title, lang, and escaped description", () => {
    const custom: SiteIdentity = {
      title: "My Site",
      lang: "tl",
      description: 'A "site" description',
    };

    const html = renderPage(makeContext({}, custom), TEMPLATE);

    expect(html).toContain('<html lang="tl">');
    expect(html).toContain("My Site");
    expect(html).toContain('<meta name="description" content="A &quot;site&quot; description" />');
  });

  it("base-paths asset hrefs and the katex stylesheet from MUFFIN_BASE_PATH", () => {
    const template = '<body>{{CSS}} {{KATEX_CSS}}</body>';

    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const withBase = renderPage(makeContext({}, site, { hasMath: true }), template);
    expect(withBase).toContain(
      '<body>/Muffin/styles.css <link rel="stylesheet" href="/Muffin/katex/katex.min.css"></body>',
    );
    expect(withBase).not.toContain("{{KATEX_CSS}}");

    delete process.env.MUFFIN_BASE_PATH;
    const noBase = renderPage(makeContext({}, site, { hasMath: true }), template);
    expect(noBase).toContain(
      '<body>/styles.css <link rel="stylesheet" href="/katex/katex.min.css"></body>',
    );
  });

  it("omits the katex stylesheet link when math is absent or options are omitted", () => {
    const template = '<body>{{CSS}} {{KATEX_CSS}}</body>';

    const falseMath = renderPage(makeContext({}, site, { hasMath: false }), template);
    expect(falseMath).toContain("<body>/styles.css </body>");
    expect(falseMath).not.toContain("katex");

    const omitted = renderPage(makeContext(), template);
    expect(omitted).not.toContain("katex");
    expect(omitted).not.toContain("{{");
  });

  it("keeps TOC fragment hrefs stable regardless of the base path", () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const withBase = renderPage(makeContext(), "<body>{{TOC}}</body>");
    expect(withBase).toContain('<a href="#intro">Intro</a>');
    expect(withBase).toContain('<a href="#details">Details</a>');

    delete process.env.MUFFIN_BASE_PATH;
    const noBase = renderPage(makeContext(), "<body>{{TOC}}</body>");
    expect(noBase).toContain('<a href="#intro">Intro</a>');
    expect(noBase).toContain('<a href="#details">Details</a>');
  });

  it("emits the toc-level hooks without any active state by default", () => {
    const html = renderPage(makeContext(), "<body>{{TOC}}</body>");
    expect(html).toContain('<ul class="toc-list">');
    expect(html).not.toContain("has-active");
    expect(html).not.toContain("is-active");
  });

  it("keeps pages without a TOC valid", () => {
    const html = renderPage(makeContext({ toc: [] }), "<body>{{TOC}}</body>");
    expect(html).toContain("<body></body>");
    expect(html).not.toContain("toc-list");
  });

  it("emits an RSS alternate link only when rssHref is set", () => {
    const template = "<head>{{RSS_LINK}}</head>";

    const withRss = renderPage(
      makeContext({}, site, { rssHref: "https://example.com/feed.xml" }),
      template,
    );
    expect(withRss).toContain(
      '<head><link rel="alternate" type="application/rss+xml" title="Muffin" href="https://example.com/feed.xml"></head>',
    );

    const noRss = renderPage(makeContext(), template);
    expect(noRss).toContain("<head></head>");
    expect(noRss).not.toContain("{{");

    const blankRss = renderPage(makeContext({}, site, { rssHref: "" }), template);
    expect(blankRss).toContain("<head></head>");
  });
});

describe("PageRenderer contract", () => {
  it("accepts renderPage as Muffin's default renderer", () => {
    const defaultRenderer: PageRenderer = renderPage;
    expect(defaultRenderer).toBe(renderPage);
  });

  it("defaults build's renderer to the shipped renderSitePage pass-through", () => {
    const defaultRenderer: PageRenderer = renderSitePage;
    expect(defaultRenderer).toBe(renderSitePage);
  });

  it("renderSitePage is behavior-neutral: byte-identical to renderPage", () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const context = makeContext({}, site, { hasMath: true, rssHref: "https://example.com/feed.xml" });
    try {
      expect(renderSitePage(context, TEMPLATE)).toBe(renderPage(context, TEMPLATE));
    } finally {
      delete process.env.MUFFIN_BASE_PATH;
    }
  });

  it("hands an injected renderer the full presentation context and template", () => {
    const received: Array<{ context: PresentationContext; template: string }> = [];
    const spy: PageRenderer = (context, template) => {
      received.push({ context, template });
      return renderPage(context, template);
    };

    const customTemplate = "<html lang=\"{{LANG}}\">{{TITLE}}</html>";
    const html = spy(makeContext(), customTemplate);

    expect(received).toHaveLength(1);
    expect(received[0]?.template).toBe(customTemplate);
    expect(received[0]?.context.page).toMatchObject({
      relPath: "My Page.md",
      title: "My Page",
      content: "<p>hello</p>",
    });
    expect(received[0]?.context.page.metadata.frontmatter).toEqual({});
    expect(received[0]?.context.site).toEqual(site);
    expect(received[0]?.context.explorerHtml).toBe("<nav></nav>");
    expect(received[0]?.context.hasMath).toBe(false);

    expect(html).toBe(renderPage(makeContext(), customTemplate));
  });

  it("lets a renderer choose presentation from arbitrary frontmatter without Muffin interpreting it", () => {
    const typeLayout: PageRenderer = (context, template) => {
      const type = context.page.metadata.frontmatter.type;
      if (type === "writings") {
        return `<div data-layout="writings">${context.page.content}</div>`;
      }
      return renderPage(context, template);
    };

    const writings = typeLayout(
      makeContext({
        metadata: { ...page.metadata, frontmatter: { type: "writings", draft: true } },
      }),
      TEMPLATE,
    );
    expect(writings).toBe('<div data-layout="writings"><p>hello</p></div>');

    const fallback = typeLayout(makeContext({ relPath: "Plain.md" }), TEMPLATE);
    expect(fallback).toContain("<title>My Page</title>");
    expect(fallback).toContain("<p>hello</p>");
  });
});