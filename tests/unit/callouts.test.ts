import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../src/content/markdown.js";

describe("Obsidian callouts", () => {
  it("renders a callout with a custom title and body", async () => {
    const html = await renderMarkdown("> [!note] Custom Title\n> Body text", {}, "source.md");

    expect(html).toContain('<blockquote class="callout" data-callout="note">');
    expect(html).toContain('<span class="callout-title-text">Custom Title</span>');
    expect(html).toContain('<div class="callout-body"><p>Body text</p></div>');
    expect(html).not.toContain("[!note]");
  });

  it("lowers the type and derives a default title when none is given", async () => {
    const html = await renderMarkdown("> [!WARNING]\n> Be careful", {}, "source.md");

    expect(html).toContain('data-callout="warning"');
    expect(html).toContain("Warning");
    expect(html).toContain("Be careful");
  });

  it("renders an expanded, foldable callout for a + marker", async () => {
    const html = await renderMarkdown("> [!tip]+ Expand", {}, "source.md");

    expect(html).toContain("callout-fold-open");
    expect(html).toContain("<details open>");
    expect(html).toContain("Expand");
  });

  it("renders a collapsed, foldable callout for a - marker", async () => {
    const html = await renderMarkdown("> [!warning]-\n> Folded body", {}, "source.md");

    expect(html).toContain("callout-fold-collapsed");
    expect(html).toContain("<details>");
    expect(html).not.toContain('<details open>');
    expect(html).toContain('<div class="callout-body"><p>Folded body</p></div>');
  });

  it("renders title-only callouts without a body", async () => {
    const html = await renderMarkdown("> [!tip]", {}, "source.md");

    expect(html).toContain("callout-title-only");
    expect(html).toContain("Tip");
    expect(html).not.toContain("callout-body");
  });

  it("renders nested callouts", async () => {
    const html = await renderMarkdown("> > [!todo] Nested\n> > inner", {}, "source.md");

    expect(html).toContain('data-callout="todo"');
    expect(html).toContain("Nested");
    expect(html).toContain("inner");
  });

  it("leaves plain blockquotes unchanged", async () => {
    const html = await renderMarkdown("> a quote", {}, "source.md");

    expect(html).toContain("<blockquote>");
    expect(html).toContain("a quote");
    expect(html).not.toContain("callout");
  });

  it("keeps callout-looking lines inside code blocks untouched", async () => {
    const html = await renderMarkdown("```\n> [!note] not a callout\n```", {}, "source.md");

    expect(html).toContain("[!note]");
    expect(html).not.toContain("<blockquote");
  });

  it("renders markdown inside the callout body", async () => {
    const html = await renderMarkdown("> [!info] T\n> **bold body**", {}, "source.md");

    expect(html).toContain('<p><strong>bold body</strong></p>');
  });

  it("parses wikilinks inside callout bodies", async () => {
    const html = await renderMarkdown("> [!note] T\n> See [[Other]]", { other: ["Other.md"] }, "source.md");

    expect(html).toContain('<a href="/Other.html">Other</a>');
  });

  it("renders list content inside a callout body", async () => {
    const html = await renderMarkdown("> [!note] T\n> - one", {}, "source.md");

    expect(html).toContain("<li>one</li>");
  });
});