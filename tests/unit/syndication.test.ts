import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { renderRssFeed, renderSitemap } from "../../src/output/syndication.js";
import type { Page } from "../../src/domain/page.js";

const ORIGINAL_BASE_PATH = process.env.MUFFIN_BASE_PATH;
const ORIGINAL_SITE_URL = process.env.MUFFIN_SITE_URL;

afterEach(() => {
  if (ORIGINAL_BASE_PATH === undefined) {
    delete process.env.MUFFIN_BASE_PATH;
  } else {
    process.env.MUFFIN_BASE_PATH = ORIGINAL_BASE_PATH;
  }
  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.MUFFIN_SITE_URL;
  } else {
    process.env.MUFFIN_SITE_URL = ORIGINAL_SITE_URL;
  }
});

function page(relPath: string, overrides: Partial<Page> = {}): Page {
  return {
    path: `/vault/${relPath}`,
    relPath,
    slug: relPath,
    title: relPath,
    content: "<p>body</p>",
    metadata: { frontmatter: {}, updated: "2026-01-05", tags: [] },
    toc: [],
    ...overrides,
  };
}

function updated(relPath: string, value: string): Page {
  return page(relPath, { metadata: { frontmatter: {}, updated: value, tags: [] } });
}

describe("renderRssFeed", () => {
  it("returns an empty string when no origin is resolved", () => {
    expect(renderRssFeed([page("Home.md")], "")).toBe("");
  });

  it("emits the channel with site identity and the base-pathed site link", () => {
    const feed = renderRssFeed([page("Home.md")], "https://example.com");

    expect(feed).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(feed).toContain('<rss version="2.0">');
    expect(feed).toContain("<channel>");
    expect(feed).toContain("<title>Muffin</title>");
    expect(feed).toContain("<link>https://example.com/</link>");
    expect(feed).toContain("<description>Muffin</description>");
    expect(feed).toContain("<language>en</language>");
  });

  it("emits one item per page with an absolute link, guid, and CDATA description", () => {
    const feed = renderRssFeed([page("Home.md")], "https://example.com");

    expect(feed).toContain("<item>");
    expect(feed).toContain("<title>Home.md</title>");
    expect(feed).toContain("<link>https://example.com/Home.html</link>");
    expect(feed).toContain('<guid isPermaLink="true">https://example.com/Home.html</guid>');
    expect(feed).toContain("<pubDate>Mon, 05 Jan 2026 00:00:00 +0000</pubDate>");
    expect(feed).toContain("<description><![CDATA[<p>body</p>]]></description>");
  });

  it("sorts items by updated descending with relPath ascending as a tiebreak", () => {
    const feed = renderRssFeed(
      [
        updated("Alpha.md", "2026-01-01"),
        updated("Gamma.md", "2026-03-01"),
        updated("Beta.md", "2026-03-01"),
      ],
      "https://example.com",
    );

    expect(feed.indexOf("/Beta.html")).toBeLessThan(feed.indexOf("/Gamma.html"));
    expect(feed.indexOf("/Gamma.html")).toBeLessThan(feed.indexOf("/Alpha.html"));
  });

  it("wraps descriptions in CDATA and splits any ]] > sequences", () => {
    const feed = renderRssFeed(
      [page("C.md", { content: "a ]]> b" })],
      "https://example.com",
    );

    expect(feed).toContain("<description><![CDATA[a ]]]]><![CDATA[> b]]></description>");
  });

  it("XML-escapes titles and link text", () => {
    const feed = renderRssFeed(
      [page('A & B < "C" >.md', {})],
      "https://example.com",
    );

    expect(feed).toContain("<title>A &amp; B &lt; &quot;C&quot; &gt;.md</title>");
    expect(feed).toContain("<link>https://example.com/A &amp; B &lt; &quot;C&quot; &gt;.html</link>");
  });

  it("prefixes every URL with MUFFIN_BASE_PATH (read at call time)", () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const feed = renderRssFeed([page("Home.md")], "https://example.com");

    expect(feed).toContain("<link>https://example.com/Muffin/</link>");
    expect(feed).toContain("<link>https://example.com/Muffin/Home.html</link>");
    expect(feed).toContain("<guid isPermaLink=\"true\">https://example.com/Muffin/Home.html</guid>");
  });

  it("emits every supplied page verbatim — drafts and empty dates are never filtered", () => {
    const feed = renderRssFeed(
      [page("drafts/Secret.md", { metadata: { frontmatter: {}, updated: "", tags: [] } })],
      "https://example.com",
    );

    expect(feed).toContain("<link>https://example.com/drafts/Secret.html</link>");
  });

  it("is opaque to arbitrary frontmatter semantics — output is byte-identical with or without them", () => {
    const base = [updated("a.md", "2026-02-02"), updated("b.md", "2026-01-01")];
    const typed = [
      page("a.md", {
        metadata: { frontmatter: { type: "writings", layout: "shell" }, updated: "2026-02-02", tags: ["x"] },
      }),
      page("b.md", { metadata: { frontmatter: { type: "project" }, updated: "2026-01-01", tags: [] } }),
    ];

    expect(renderRssFeed(typed, "https://example.com")).toBe(
      renderRssFeed(base, "https://example.com"),
    );
  });
});

describe("renderSitemap", () => {
  it("returns an empty string when no origin is resolved", () => {
    expect(renderSitemap([page("Home.md")], "")).toBe("");
  });

  it("emits a urlset with absolute loc and ISO lastmod per page", () => {
    const sitemap = renderSitemap(
      [page("About.md", { metadata: { frontmatter: {}, updated: "2026-09-21", tags: [] } })],
      "https://example.com",
    );

    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain("<loc>https://example.com/About.html</loc>");
    expect(sitemap).toContain("<lastmod>2026-09-21</lastmod>");
  });

  it("prefixes URLs with MUFFIN_BASE_PATH", () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const sitemap = renderSitemap([page("Home.md")], "https://example.com");

    expect(sitemap).toContain("<loc>https://example.com/Muffin/Home.html</loc>");
  });

  it("emits every supplied page verbatim — profile-independent, never filtered", () => {
    const sitemap = renderSitemap(
      [
        page("drafts/note.md", {
          metadata: { frontmatter: { type: "experiment" }, updated: "", tags: [] },
        }),
      ],
      "https://example.com",
    );

    expect(sitemap).toContain("<loc>https://example.com/drafts/note.html</loc>");
    expect(sitemap).toContain("<lastmod></lastmod>");
  });

  it("is opaque to arbitrary frontmatter semantics", () => {
    const base = [updated("a.md", "2026-02-02")];
    const typed = [
      page("a.md", {
        metadata: { frontmatter: { type: "writings", tags: ["technical"] }, updated: "2026-02-02", tags: [] },
      }),
    ];

    expect(renderSitemap(typed, "https://example.com")).toBe(
      renderSitemap(base, "https://example.com"),
    );
  });
});

describe("syndication architectural guardrails", () => {
  it("contains no page-type interpretation, filtering, or registry machinery", () => {
    const source = fs.readFileSync(
      new URL("../../src/output/syndication.ts", import.meta.url),
      "utf-8",
    );

    expect(source).not.toMatch(/frontmatter\.type/);
    expect(source).not.toMatch(/\bswitch\s*\(/);
    expect(source).not.toMatch(/PageType|WritingPage|ProjectPage|AboutPage|ExperimentPage/);
    expect(source).not.toMatch(/registr/i);
    expect(source).not.toMatch(/\bimport\s+.*\bfrom\s+["']node:fs["']/);
  });

  it("operates only on the generic Page[] model", () => {
    expect(renderRssFeed([page("Home.md")], "https://example.com")).not.toContain(
      "frontmatter",
    );
    expect(renderSitemap([page("Home.md")], "https://example.com")).not.toContain(
      "frontmatter",
    );
  });
});