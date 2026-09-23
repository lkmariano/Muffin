import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../src/content/markdown.js";

describe("Obsidian comments", () => {
  it("removes inline comments from the output", async () => {
    const html = await renderMarkdown("a %%hidden note%% b", {}, "source.md");

    expect(html).toContain("<p>a  b</p>");
    expect(html).not.toContain("%%");
    expect(html).not.toContain("hidden note");
  });

  it("removes multi-line block comments", async () => {
    const html = await renderMarkdown("before %%\ncomment lines\n%% after", {}, "source.md");

    expect(html).not.toContain("%%");
    expect(html).not.toContain("comment lines");
    expect(html).toContain("before");
    expect(html).toContain("after");
  });

  it("keeps comment markers inside code untouched", async () => {
    const html = await renderMarkdown("`%%inline%%`\n\n```\n%%fenced%%\n```", {}, "source.md");

    expect(html).toContain("<code>%%inline%%</code>");
    expect(html).toContain("%%fenced%%");
  });
});

describe("Obsidian highlights", () => {
  it("renders ==text== as a mark element", async () => {
    const html = await renderMarkdown("see ==highlight me==", {}, "source.md");

    expect(html).toContain("<mark>highlight me</mark>");
  });

  it("renders multiple highlights in one paragraph", async () => {
    const html = await renderMarkdown("==a== and ==b==", {}, "source.md");

    expect(html).toContain("<mark>a</mark>");
    expect(html).toContain("<mark>b</mark>");
  });

  it("keeps highlight markers inside code untouched", async () => {
    const html = await renderMarkdown("`==x==`\n\n```\n==y==\n```", {}, "source.md");

    expect(html).toContain("<code>==x==</code>");
    expect(html).toContain("==y==");
    expect(html).not.toContain("<mark>");
  });
});

describe("math / LaTeX", () => {
  it("renders inline math with KaTeX", async () => {
    const html = await renderMarkdown("Inline $C_L$ math", {}, "source.md");

    expect(html).toContain('<span class="katex">');
    expect(html).toContain("C_L");
    expect(html).not.toContain("katex-error");
  });

  it("renders display math with KaTeX", async () => {
    const html = await renderMarkdown("$$\nE = mc^2\n$$", {}, "source.md");

    expect(html).toContain('<span class="katex">');
    expect(html).toContain("E = mc^2");
  });

  it("does not treat math markers inside code as math", async () => {
    const html = await renderMarkdown("`$x$`\n\n```\n$$y$$\n```", {}, "source.md");

    expect(html).toContain("<code>$x$</code>");
    expect(html).toContain("$$y$$");
    expect(html).not.toContain('<span class="katex">');
  });

  it("renders invalid authoring math as an inline error instead of failing", async () => {
    const html = await renderMarkdown("$$ $\\text{unclosed $$", {}, "source.md");

    expect(html).toContain("katex-error");
  });
});