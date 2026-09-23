import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../src/content/markdown.js";

describe("GFM tables", () => {
  it("renders a table with header, delimiter, and body rows", async () => {
    const md = ["| a | b |", "| --- | --- |", "| 1 | 2 |"].join("\n");
    const html = await renderMarkdown(md, {}, "source.md");

    expect(html).toContain("<table>");
    expect(html).toContain("<th>a</th>");
    expect(html).toContain("<th>b</th>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
  });

  it("renders alignment from colon-delimited delimiters", async () => {
    const md = ["| a | b |", "|:---| ---: |", "| 1 | 2 |"].join("\n");
    const html = await renderMarkdown(md, {}, "source.md");

    expect(html).toContain('<th align="left">a</th>');
    expect(html).toContain('<th align="right">b</th>');
    expect(html).toContain('<td align="right">2</td>');
  });

  it("renders escaped pipes as literal pipe characters", async () => {
    const md = ["| a \\| b | c |", "| --- | --- |", "| 1 | 2 |"].join("\n");
    const html = await renderMarkdown(md, {}, "source.md");

    expect(html).toContain("<th>a | b</th>");
  });
});

describe("GFM task lists", () => {
  it("renders unchecked and checked task list items", async () => {
    const md = ["- [ ] todo", "- [x] done"].join("\n");
    const html = await renderMarkdown(md, {}, "source.md");

    expect(html).toContain('<ul class="contains-task-list">');
    expect(html).toContain('<li class="task-list-item"><input type="checkbox" disabled> todo</li>');
    expect(html).toContain('<input type="checkbox" checked disabled> done');
  });
});

describe("GFM strikethrough", () => {
  it("renders double-tilde as deleted text", async () => {
    const html = await renderMarkdown("~~strike~~", {}, "source.md");
    expect(html).toContain("<del>strike</del>");
  });
});

describe("GFM extended autolinks", () => {
  it("autolinks bare https urls", async () => {
    const html = await renderMarkdown("https://example.com", {}, "source.md");
    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
  });
});

describe("GFM footnotes", () => {
  it("renders footnote references and a footnotes section", async () => {
    const md = ["Note[^1]", "", "[^1]: the footnote"].join("\n");
    const html = await renderMarkdown(md, {}, "source.md");

    expect(html).toContain("<sup>");
    expect(html).toContain('id="user-content-fnref-1"');
    expect(html).toContain('class="footnotes"');
    expect(html).toContain('id="user-content-fn-1"');
    expect(html).toContain("the footnote");
  });
});

describe("raw HTML stays dropped", () => {
  it("keeps disallowed HTML out of the rendered output", async () => {
    const html = await renderMarkdown(
      "<script>alert(1)</script>\n\n<div>raw</div>",
      {},
      "source.md",
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<div>");
    expect(html).not.toContain("alert(1)");
  });
});

describe("wikilinks and image embeds inside GFM structures", () => {
  it("resolves a wikilink inside a table cell", async () => {
    const md = ["| [[About]] | x |", "| --- | --- |", "| 1 | 2 |"].join("\n");
    const html = await renderMarkdown(md, { about: ["About.md"] }, "source.md");

    expect(html).toContain("<table>");
    expect(html).toContain('<a href="/About.html">About</a>');
  });

  it("resolves an image embed inside a table cell", async () => {
    const md = ["| ![[img.png]] | x |", "| --- | --- |", "| 1 | 2 |"].join("\n");
    const html = await renderMarkdown(md, {}, "source.md", ["img.png"]);

    expect(html).toContain('<img src="/img.png" alt="img">');
  });
});