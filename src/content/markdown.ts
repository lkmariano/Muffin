import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import { findAndReplace } from "mdast-util-find-and-replace";
import { visit } from "unist-util-visit";
import { unified } from "unified";
import { wikilinkPlugin, wikilinkToUrlPlugin } from "../../plugins/wikilinks.js";
import { imageEmbedPlugin, imageEmbedUrlPlugin, imageEmbedAlt } from "../../plugins/image-embeds.js";
import { blockIdPlugin, headingIdPlugin } from "./anchors.js";

import type { Root } from "mdast";
import type { Options as RemarkRehypeOptions } from "remark-rehype";

export type ParsedMarkdown = {
  path: string;
  relPath: string;
  tree: Root;
};

const COMMENT_PATTERN = /%%[\s\S]*?%%/g;
const HIGHLIGHT_PATTERN = /==([^=\n]+)==/g;
const CALLOUT_PATTERN = /^\[!([A-Za-z]+)\]([+-]?)\s?(.*)$/;

export function containsMath(tree: Root): boolean {
  let found = false;
  visit(tree, (node) => {
    if (node.type === "math" || node.type === "inlineMath") {
      found = true;
    }
  });
  return found;
}

export async function parseMarkdown(
  body: string,
  slugMap: Record<string, string[]>,
  currentFile: string,
  assetPaths: string[] = [],
): Promise<Root> {
  const parser = unified()
    .use(remarkParse)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkMath)
    .use(imageEmbedPlugin, assetPaths, currentFile)
    .use(wikilinkPlugin, slugMap, currentFile)
    .use(ofmInlinePlugin)
    .use(headingIdPlugin)
    .use(blockIdPlugin);

  const tree = parser.parse(body) as Root;
  return parser.run(tree) as Promise<Root>;
}

export async function renderMarkdownTree(tree: Root, basePath = ""): Promise<string> {
  const renderer = unified()
    .use(imageEmbedUrlPlugin, basePath)
    .use(wikilinkToUrlPlugin, basePath)
    .use(remarkRehype, {
      handlers: {
        highlight: highlightHandler,
        pdf: pdfHandler,
      } as unknown as RemarkRehypeOptions["handlers"],
    })
    .use(rehypeKatex, { strict: false, throwOnError: false })
    .use(rehypeCalloutPlugin)
    .use(rehypeStringify);

  const hast = await renderer.run(tree);
  return String(renderer.stringify(hast));
}

export async function renderMarkdown(
  body: string,
  slugMap: Record<string, string[]>,
  currentFile: string,
  basePath = "",
  assetPaths: string[] = [],
): Promise<string> {
  return renderMarkdownTree(await parseMarkdown(body, slugMap, currentFile, assetPaths), basePath);
}

// Comments (%%...%%) are removed; highlights (==...==) become semantic
// `highlight` mdast nodes mapped to <mark> by the renderer.
function ofmInlinePlugin(): (tree: Root) => void {
  return (tree: Root): void => {
    findAndReplace(tree, [
      [COMMENT_PATTERN, () => ""],
      [
        HIGHLIGHT_PATTERN,
        (_value: string, capturedText: string) =>
          ({
            type: "highlight",
            children: [{ type: "text", value: capturedText }],
          }) as any,
      ],
    ]);
  };
}

function highlightHandler(state: any, node: any): any {
  const result = {
    type: "element",
    tagName: "mark",
    properties: {},
    children: state.all(node),
  };
  state.patch(node, result);
  return result;
}

function pdfHandler(state: any, node: any): any {
  const result = {
    type: "element",
    tagName: "iframe",
    properties: {
      className: ["pdf-embed"],
      src: node.url,
      title: imageEmbedAlt(node.url),
    },
    children: [],
  };
  state.patch(node, result);
  return result;
}

// Callouts are a render-stage HAST transformation: blockquotes whose first
// paragraph opens with [!type] become <blockquote class="callout"> with a title
// element and optional fold wrapper. Nested callouts are kept intact.
function rehypeCalloutPlugin(): (tree: any) => void {
  return (tree: any): void => {
    const blockquotes: any[] = [];
    visit(tree, "element", (node: any) => {
      if (node.tagName === "blockquote") {
        blockquotes.push(node);
      }
    });
    for (const blockquote of blockquotes) {
      toCallout(blockquote);
    }
  };
}

function toCallout(blockquote: any): void {
  const firstIndex = blockquote.children.findIndex(
    (child: any) => child.type === "element" && child.tagName === "p",
  );
  if (firstIndex === -1) {
    return;
  }
  const first = blockquote.children[firstIndex];
  const firstChild = first.children[0];
  if (!firstChild || !firstChild.type || firstChild.type !== "text") {
    return;
  }

  const firstLine = firstChild.value.split("\n")[0];
  const match = CALLOUT_PATTERN.exec(firstLine ?? "");
  if (!match) {
    return;
  }

  const type = match[1] ?? "";
  const fold = match[2];
  const inlineTitle = match[3]?.trim() ?? "";
  const titleText =
    inlineTitle !== "" ? inlineTitle : type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

  const afterFirstLine = firstChild.value.slice(firstLine.length).replace(/^\n/, "");

  const remainderChildren = first.children
    .slice(1)
    .filter((child: any) => !(child.type === "text" && (child.value ?? "").trim() === ""));

  const reconstructedChildren: any[] = [];
  if (afterFirstLine.trim() !== "") {
    reconstructedChildren.push({ type: "text", value: afterFirstLine });
  }
  reconstructedChildren.push(...remainderChildren);

  const bodyChildren: any[] = [];
  if (reconstructedChildren.length > 0) {
    bodyChildren.push({
      type: "element",
      tagName: "p",
      properties: { ...(first.properties ?? {}) },
      children: reconstructedChildren,
    });
  }
  const otherChildren = blockquote.children
    .slice(firstIndex + 1)
    .filter((child: any) => !(child.type === "text" && (child.value ?? "").trim() === ""));
  bodyChildren.push(...otherChildren);

  const titleElement = {
    type: "element",
    tagName: fold !== "" ? "summary" : "div",
    properties: { className: ["callout-title"] },
    children: [
      { type: "element", tagName: "span", properties: { className: ["callout-icon"] }, children: [] },
      {
        type: "element",
        tagName: "span",
        properties: { className: ["callout-title-text"] },
        children: [{ type: "text", value: titleText }],
      },
    ],
  };

  const existingClasses = blockquote.properties?.className;
  const existingList =
    existingClasses == null
      ? []
      : Array.isArray(existingClasses)
        ? existingClasses
        : [existingClasses];
  const classes = [
    ...existingList,
    "callout",
    ...(fold === "+" ? ["callout-fold-open"] : []),
    ...(fold === "-" ? ["callout-fold-collapsed"] : []),
    ...(bodyChildren.length === 0 ? ["callout-title-only"] : []),
  ];

  blockquote.properties = {
    ...(blockquote.properties ?? {}),
    className: classes,
    dataCallout: type.toLowerCase(),
  };

  const bodyElement =
    bodyChildren.length === 0
      ? undefined
      : {
          type: "element",
          tagName: "div",
          properties: { className: ["callout-body"] },
          children: bodyChildren,
        };

  if (fold !== "") {
    blockquote.children = [
      {
        type: "element",
        tagName: "details",
        properties: fold === "+" ? { open: true } : {},
        children: bodyElement === undefined ? [titleElement] : [titleElement, bodyElement],
      },
    ];
  } else {
    blockquote.children = bodyElement === undefined ? [titleElement] : [titleElement, bodyElement];
  }
}