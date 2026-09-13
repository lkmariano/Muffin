# Muffin

A barebones static site generator built in Node.js + TypeScript for Obsidian vaults, supporting nested folders, wikilinks, backlinks, and extensible page layouts via scoped CSS.

## Status: Core pipeline working end-to-end

Point it at a `content/` folder of markdown files and it will:

- discover files recursively (nested folders supported)
- resolve `[[wikilinks]]` against real files (same-folder-first tie-breaking for duplicate filenames)
- compute backlinks
- build an explorer/navigation tree from the folder structure
- render each page through an HTML template
- write real `.html` files to `muffin/`, mirroring the folder structure
- **prune stale output**: deleting a `.md` source removes its generated `.html` on the next build

## Page Types

Each page can declare a type in its YAML frontmatter:

```yaml
---
type: portfolio
---
```

Supported: `portfolio` | `note` | `home`. Missing or unknown types default to `note`.

The build injects the resolved type and the page slug as attributes on `<body>`:

```html
<body data-page-type="portfolio" data-slug="muffin">
```

The single global stylesheet (`templates/styles.css`) uses these attributes as parent selectors to apply layout-specific rules, e.g. `body[data-page-type="home"] aside { display: none; }`. Theme tokens (colors, fonts, spacing) stay global and universal in `muffin.config.json` — no per-type configuration needed.

## Commands

- **Build:** `npx tsx build.ts`
- **Test:** `npm test`

## Architecture

```
content/*.md
  → loadContent()            recursive discovery + frontmatter parse → LoadedContent[]
  → slugMap                  slug → [candidate file paths] (supports duplicate filenames)
  → parseMarkdown()          body → shared mdast tree (wikilinks resolved once)
  → buildSiteGraph()         forward/back links from the parsed ASTs
  → renderMarkdownTree()     same trees → HTML
  → buildExplorerTree()      from relPath, no filesystem access → explorer HTML
  → resolvePageType()        frontmatter `type` → portfolio | note | home
  → renderPage()             page + homepage config → HTML shell; type/slug on <body>
  → writePages()             writes .html to muffin/, prunes stale output
  → writeStaticAssets()      copies styles.css + generates theme.css
```

Pipeline order matters: the graph is built before rendering because `renderMarkdownTree` mutates the shared markdown AST.