import { afterEach, describe, expect, it } from "vitest";
import { containsMath, parseMarkdown, renderMarkdown } from "../../src/content/markdown.js";

const ORIGINAL_BASE_PATH = process.env.MUFFIN_BASE_PATH;

afterEach(() => {
  if (ORIGINAL_BASE_PATH === undefined) {
    delete process.env.MUFFIN_BASE_PATH;
  } else {
    process.env.MUFFIN_BASE_PATH = ORIGINAL_BASE_PATH;
  }
});

describe("containsMath", () => {
  it("detects inline math", async () => {
    const tree = await parseMarkdown("Inline $C_L$ math", {}, "source.md");
    expect(containsMath(tree)).toBe(true);
  });

  it("detects display math", async () => {
    const tree = await parseMarkdown("$$\nE = mc^2\n$$", {}, "source.md");
    expect(containsMath(tree)).toBe(true);
  });

  it("returns false for dollar signs inside code", async () => {
    const tree = await parseMarkdown("`$x$`\n\n```\n$$y$$\n```", {}, "source.md");
    expect(containsMath(tree)).toBe(false);
  });
});

describe("renderMarkdown", () => {
  it("renders unresolved wikilinks as plain text", async () => {
    const html = await renderMarkdown("See [[Missing Note]]", {}, "source.md");

    expect(html).toContain("See Missing Note");
    expect(html).not.toContain("<a");
  });

  it("renders missing image embeds as literal text", async () => {
    const html = await renderMarkdown("See ![[missing.png]]", {}, "source.md", [
      "images/test.png",
    ]);

    expect(html).toContain("![[missing.png]]");
    expect(html).not.toContain("<img");
  });

  it("keeps embeds of discovered non-image assets as literal text", async () => {
    const html = await renderMarkdown("See ![[clip.mp4]]", {}, "source.md", ["clip.mp4"]);

    expect(html).toContain("![[clip.mp4]]");
    expect(html).not.toContain("<img");
  });

  it("applies the MUFFIN_BASE_PATH base path to reference hrefs", async () => {
    process.env.MUFFIN_BASE_PATH = "/Muffin";
    const html = await renderMarkdown("See [[Target#Some Heading]]", {
      target: ["Target.md"],
    }, "source.md");

    expect(html).toContain('<a href="/Muffin/Target.html#some-heading">Some Heading</a>');
  });
});