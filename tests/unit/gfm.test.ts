import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../src/content/markdown.js";

describe("GFM tables", () => {
  it("renders a table with header, delimiter, and body rows", async () => {
    const md = [
      "| a | b |",
      "| --- | --- |",
      "| 1 | 2 |",
    ].join("\n");

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

  it("does not treat a mismatched delimiter row as a table", async () => {
    const html = await renderMarkdown("| a | b\n| --- |", {}, "source.md");

    expect(html).not.toContain("<table>");
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

  it("renders nested task list items", async () => {
    const md = ["- [ ] top", "  - [x] nested"].join("\n");

    const html = await renderMarkdown(md, {}, "source.md");

    expect(html).toContain('<input type="checkbox" disabled> top');
    expect(html).toContain('<input type="checkbox" checked disabled> nested');
    expect(html).toMatch(/<ul class="contains-task-list">[\s\S]*<ul class="contains-task-list">/);
  });
});

describe("GFM strikethrough", () => {
  it("renders double-tilde as deleted text", async () => {
    const html = await renderMarkdown("~~strike~~", {}, "source.md");
    expect(html).toContain("<del>strike</del>");
  });

  it("leaves single-tilde text unchanged", async () => {
    const html = await renderMarkdown("~single~", {}, "source.md");
    expect(html).toContain("~single~");
    expect(html).not.toContain("<del>");
  });
});

describe("GFM extended autolinks", () => {
  it("autolinks bare https urls", async () => {
    const html = await renderMarkdown("https://example.com", {}, "source.md");
    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
  });

  it("autolinks www urls with an http scheme", async () => {
    const html = await renderMarkdown("www.github.com", {}, "source.md");
    expect(html).toContain('<a href="http://www.github.com">www.github.com</a>');
  });

  it("autolinks bare emails with a mailto scheme", async () => {
    const html = await renderMarkdown("x@y.com", {}, "source.md");
    expect(html).toContain('<a href="mailto:x@y.com">x@y.com</a>');
  });

  it("leaves explicit markdown links unchanged", async () => {
    const html = await renderMarkdown("[text](https://a.io)", {}, "source.md");
    expect(html).toContain('<a href="https://a.io">text</a>');
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

    const html = await renderMarkdown(md, {}, "source.md", "", ["img.png"]);

    expect(html).toContain('<img src="/img.png" alt="img">');
  });

  it("resolves a wikilink inside strikethrough", async () => {
    const html = await renderMarkdown("~~[[Note]]~~", { note: ["Note.md"] }, "source.md");

    expect(html).toContain('<del><a href="/Note.html">Note</a></del>');
  });

  it("resolves a wikilink inside a task list item", async () => {
    const html = await renderMarkdown(
      "- [ ] do [[X]]",
      { x: ["X.md"] },
      "source.md",
    );

    expect(html).toContain('<input type="checkbox" disabled> do <a href="/X.html">X</a>');
  });

  it("resolves a wikilink inside a footnote definition", async () => {
    const md = ["Note[^1]", "", "[^1]: see [[Other]]"].join("\n");

    const html = await renderMarkdown(md, { other: ["Other.md"] }, "source.md");

    expect(html).toContain('<a href="/Other.html">Other</a>');
    expect(html).toContain('class="footnotes"');
  });
});