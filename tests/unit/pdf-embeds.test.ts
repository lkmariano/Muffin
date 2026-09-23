import { afterEach, describe, expect, it } from "vitest";
import { renderMarkdown } from "../../src/content/markdown.js";

const ORIGINAL_BASE_PATH = process.env.MUFFIN_BASE_PATH;

afterEach(() => {
  if (ORIGINAL_BASE_PATH === undefined) {
    delete process.env.MUFFIN_BASE_PATH;
  } else {
    process.env.MUFFIN_BASE_PATH = ORIGINAL_BASE_PATH;
  }
});

describe("Obsidian PDF embeds", () => {
  it("renders a resolved PDF embed as a framed document and applies the base path", async () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const html = await renderMarkdown("![[manual.pdf]]", {}, "notes/example.md", [
      "docs/manual.pdf",
    ]);

    expect(html).toContain(
      '<iframe class="pdf-embed" src="/Muffin/docs/manual.pdf" title="manual"></iframe>',
    );
  });

  it("keeps missing PDF embeds and non-PDF non-image assets as literal text", async () => {
    const html = await renderMarkdown(
      "![[missing.pdf]] and ![[clip.mp4]]",
      {},
      "source.md",
      ["document.pdf", "clip.mp4"],
    );

    expect(html).toContain("![[missing.pdf]]");
    expect(html).toContain("![[clip.mp4]]");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<img");
  });

  it("renders a PDF embed inside a callout body", async () => {
    const html = await renderMarkdown(
      "> [!note] T\n> See ![[document.pdf]]",
      {},
      "source.md",
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
      ["document.pdf", "test.png"],
    );

    expect(html).toContain('<a href="/About.html">About</a>');
    expect(html).toContain(
      '<iframe class="pdf-embed" src="/document.pdf" title="document"></iframe>',
    );
    expect(html).toContain('<img src="/test.png" alt="test">');
  });
});