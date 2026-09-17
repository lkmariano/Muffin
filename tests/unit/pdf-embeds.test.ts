import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../src/content/markdown.js";

describe("Obsidian PDF embeds", () => {
  it("renders a resolved PDF embed as a framed document", async () => {
    const html = await renderMarkdown(
      "See ![[document.pdf]]",
      {},
      "source.md",
      "",
      ["document.pdf"],
    );

    expect(html).toContain(
      '<iframe class="pdf-embed" src="/document.pdf" title="document"></iframe>',
    );
  });

  it("resolves a nested PDF embed to its root-relative URL", async () => {
    const html = await renderMarkdown(
      "![[manual.pdf]]",
      {},
      "notes/example.md",
      "",
      ["docs/manual.pdf"],
    );

    expect(html).toContain(
      '<iframe class="pdf-embed" src="/docs/manual.pdf" title="manual"></iframe>',
    );
  });

  it("applies the base path to PDF embed URLs", async () => {
    const html = await renderMarkdown(
      "![[manual.pdf]]",
      {},
      "source.md",
      "/Muffin",
      ["docs/manual.pdf"],
    );

    expect(html).toContain(
      '<iframe class="pdf-embed" src="/Muffin/docs/manual.pdf" title="manual"></iframe>',
    );
  });

  it("resolves mixed-case PDF extensions", async () => {
    const html = await renderMarkdown("![[Guide.PDF]]", {}, "source.md", "", [
      "Guide.PDF",
    ]);

    expect(html).toContain(
      '<iframe class="pdf-embed" src="/Guide.PDF" title="Guide"></iframe>',
    );
  });

  it("keeps a missing PDF embed as literal text", async () => {
    const html = await renderMarkdown(
      "See ![[missing.pdf]]",
      {},
      "source.md",
      "",
      ["document.pdf"],
    );

    expect(html).toContain("See ![[missing.pdf]]");
    expect(html).not.toContain("<iframe");
  });

  it("keeps non-PDF non-image asset embeds as literal text", async () => {
    const html = await renderMarkdown(
      "![[clip.mp4]] and ![[data.txt]]",
      {},
      "source.md",
      "",
      ["clip.mp4", "data.txt"],
    );

    expect(html).toContain("![[clip.mp4]]");
    expect(html).toContain("![[data.txt]]");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<img");
  });

  it("renders a PDF embed inside a GFM table", async () => {
    const md = ["| ![[document.pdf]] | x |", "| --- | --- |", "| 1 | 2 |"].join("\n");

    const html = await renderMarkdown(md, {}, "source.md", "", ["document.pdf"]);

    expect(html).toContain("<table>");
    expect(html).toContain(
      '<iframe class="pdf-embed" src="/document.pdf" title="document"></iframe>',
    );
  });

  it("renders a PDF embed inside a callout body", async () => {
    const html = await renderMarkdown(
      "> [!note] T\n> See ![[document.pdf]]",
      {},
      "source.md",
      "",
      ["document.pdf"],
    );

    expect(html).toContain('data-callout="note"');
    expect(html).toContain(
      '<iframe class="pdf-embed" src="/document.pdf" title="document"></iframe>',
    );
  });

  it("keeps PDF embed syntax inside fenced code literal", async () => {
    const html = await renderMarkdown(
      "```\n![[document.pdf]]\n```",
      {},
      "source.md",
      "",
      ["document.pdf"],
    );

    expect(html).toContain("![[document.pdf]]");
    expect(html).not.toContain("<iframe");
  });

  it("renders PDF embeds alongside image embeds and wikilinks", async () => {
    const html = await renderMarkdown(
      "See [[About]] and ![[document.pdf]] and ![[test.png]]",
      { about: ["About.md"] },
      "source.md",
      "",
      ["document.pdf", "test.png"],
    );

    expect(html).toContain('<a href="/About.html">About</a>');
    expect(html).toContain(
      '<iframe class="pdf-embed" src="/document.pdf" title="document"></iframe>',
    );
    expect(html).toContain('<img src="/test.png" alt="test">');
  });
});