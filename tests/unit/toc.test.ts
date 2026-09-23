import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { extractToc } from "../../src/content/toc.js";
import { parseMarkdown } from "../../src/content/markdown.js";

import type { Root } from "mdast";

function root(children: unknown[]): Root {
  return { type: "root", children: children as Root["children"] };
}

function heading(depth: 1 | 2 | 3 | 4 | 5 | 6, children: unknown[], id = ""): unknown {
  const node: any = { type: "heading", depth, children };
  if (id !== "") {
    node.data = { headingId: id };
  }
  return node;
}

function text(value: string): unknown {
  return { type: "text", value };
}

function parse(value: string): Root {
  return unified().use(remarkParse).parse(value) as Root;
}

describe("extractToc", () => {
  it("includes H1, H2, and H3 headings", () => {
    const toc = extractToc(
      root([
        heading(1, [text("One")], "one"),
        heading(2, [text("Two")], "two"),
        heading(3, [text("Three")], "three"),
      ]),
    );

    expect(toc).toEqual([
      { depth: 1, text: "One", id: "one" },
      { depth: 2, text: "Two", id: "two" },
      { depth: 3, text: "Three", id: "three" },
    ]);
  });

  it("excludes H4, H5, and H6 headings", () => {
    const toc = extractToc(
      root([
        heading(4, [text("Four")], "four"),
        heading(5, [text("Five")], "five"),
        heading(6, [text("Six")], "six"),
      ]),
    );

    expect(toc).toEqual([]);
  });

  it("preserves document order", () => {
    const toc = extractToc(
      root([
        heading(3, [text("A")], "a"),
        heading(1, [text("B")], "b"),
        heading(2, [text("C")], "c"),
        heading(4, [text("D")], "d"),
      ]),
    );

    expect(toc.map((entry) => entry.depth)).toEqual([3, 1, 2]);
    expect(toc.map((entry) => entry.text)).toEqual(["A", "B", "C"]);
  });

  it("flattens bold text", () => {
    const toc = extractToc(
      root([
        heading(1, [text("Intro "), { type: "strong", children: [text("Bold")] }], "intro"),
      ]),
    );

    expect(toc[0]?.text).toBe("Intro Bold");
  });

  it("flattens inline code text", () => {
    const toc = extractToc(
      root([heading(1, [text("Use "), { type: "inlineCode", value: "npm install" }], "use")]),
    );

    expect(toc[0]?.text).toBe("Use npm install");
  });

  it("flattens wikilink text to its display label", () => {
    const toc = extractToc(
      root([
        heading(1, [text("Go to "), { type: "link", url: "Note.md", children: [text("Note")] }], "go"),
      ]),
    );

    expect(toc[0]?.text).toBe("Go to Note");
  });

  it("produces an empty text for an empty heading", () => {
    const toc = extractToc(root([heading(1, [], "empty"), heading(1, [text("")], "blank")]));

    expect(toc[0]).toEqual({ depth: 1, text: "", id: "empty" });
    expect(toc[1]?.text).toBe("");
  });

  it("keeps duplicate IDs as separate entries without deduplication", () => {
    const toc = extractToc(
      root([heading(1, [text("A")], "same"), heading(1, [text("B")], "same")]),
    );

    expect(toc).toEqual([
      { depth: 1, text: "A", id: "same" },
      { depth: 1, text: "B", id: "same" },
    ]);
  });

  it("walks only direct root children", () => {
    const rootTree = parse("# Top\n\n> # Quoted\n\n## Sub");
    const toc = extractToc(rootTree);

    expect(toc.map((entry) => entry.text)).toEqual(["Top", "Sub"]);
  });

  it("reuses the heading IDs assigned by the real parseMarkdown pipeline", async () => {
    const tree = await parseMarkdown(
      "# Hi\n\n## Sub\n\n# Hi\n\n#### Deep",
      { hi: ["Hi.md"] },
      "TocHost.md",
    );

    const toc = extractToc(tree);

    expect(toc).toEqual([
      { depth: 1, text: "Hi", id: "hi" },
      { depth: 2, text: "Sub", id: "sub" },
      { depth: 1, text: "Hi", id: "hi-1" },
    ]);
  });
});