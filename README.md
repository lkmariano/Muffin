# Muffin

A barebones static site generator built in Node.js + TypeScript for Obsidian vaults, supporting nested folders, wikilinks, backlinks, and an explorer navigation tree.

## Status: Core pipeline working end-to-end

Point Muffin at a `content/` folder of markdown files and it will:

- discover files recursively (nested folders supported)
- resolve `[[wikilinks]]` against real files (same-folder-first tie-breaking for duplicate filenames)
- compute backlinks
- build an explorer/navigation tree from the folder structure
- render each page through an HTML template
- write real `.html` files to `muffin/`, mirroring the folder structure
- **prune stale output**: deleting a `.md` source removes its generated `.html` on the next build

## Zero Configuration

Muffin works without any configuration file. A fresh build uses neutral defaults:

- a light, readable default theme (`src/theme/defaults.ts`) with system font stacks — no external font imports
- site title `Muffin`, language `en`
- a homepage derived from `home.md` or `index.md`, aliased to `index.html`

The repository ships a small sample vault in `content/` to demonstrate nested folders, wikilinks, and backlinks. Replace it with your own content — Muffin makes no assumptions about a particular site's identity or design.

## Configuration

All configuration lives in a single optional JSON file (e.g. `muffin.config.json`). Every field falls back to a sensible default when missing.

```json
{
  "site": {
    "title": "My Site",
    "lang": "en",
    "description": "Optional meta description"
  },
  "theme": {
    "colors": { "text-primary": "#1a1a1a" },
    "fonts": { "body": "'Lora', Georgia, serif" }
  },
  "homepage": "projects"
}
```

- **site** — identity metadata: `title` (default `Muffin`), `lang` (default `en`), optional `description` (rendered as a `<meta name="description">` tag).
- **theme** — tokens for `colors`, `fonts`, `font-sizes`, `spacing`, and `layout`. Groups are merged per-key over the neutral defaults; site-specific styles stay out of the engine.
- **homepage** — basename of the source page aliased to `index.html`. When omitted, Muffin prefers `home.md`, then `index.md`; if neither exists, no `index.html` is generated.

Identity and theme are presentation, not content. The default experience is Muffin's — making a site your own is a per-site concern, not something hardcoded into the engine.

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
  → loadConfig()             optional JSON config merged over defaults
  → renderMarkdownTree()     same trees → HTML
  → buildExplorerTree()      from relPath, no filesystem access → explorer HTML
  → renderPage()             page + site identity → HTML shell; slug on <body>
  → writePages()             writes .html to muffin/, resolves homepage, prunes stale output
  → writeStaticAssets()      copies styles.css + generates theme.css
```

Pipeline order matters: config loads after parsing and graph construction but before rendering, so site identity can feed `renderPage` while theme and homepage feed output. `buildSiteGraph` must run before `renderMarkdownTree` because rendering mutates the shared markdown AST.

## Page Shell

Each page renders through `templates/page.html`. The `<body>` carries a `data-slug` attribute as a generic scoping hook for site CSS. The page type concept from earlier phases was removed — Muffin does not ship site-specific page types such as "portfolio" or "home".

Template tokens: `{{TITLE}}`, `{{CONTENT}}`, `{{BACKLINKS}}`, `{{NAV}}`, `{{CSS}}`, `{{THEME_CSS}}`, `{{PAGE_META}}`, `{{SITE_TITLE}}`, `{{LANG}}`, `{{SITE_DESCRIPTION}}`, `{{BODY_ATTRS}}`.