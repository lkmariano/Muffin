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
- copy vault images/PDFs into the output and embed them with `![[...]]`
- copy a project-level `public/` directory through verbatim (favicons, robots.txt, site CSS, ...)
- render GFM, KaTeX math (emitted only when the vault contains math), callouts, highlights/comments, and `[[note#Heading]]`/`[[note#^block-id]]` references
- render a per-page table of contents (H1–H3) and a backlinks section in the right-sidebar
- highlight the current page and its ancestor folders in the Explorer (server-rendered, `aria-current`)
- persist Explorer folder state across visits (`localStorage`, scoped per `basePath`)
- highlight scrolled-through TOC headings (dimmed until passed) with an on-page scroll-spy
- collapse the Explorer into a `≤899px` off-canvas drawer nav with a burger button on the top bar
- mark keyboard focus site-wide and give `focus-visible` a visible ring

## Zero Configuration

Muffin works without any configuration file. A fresh build uses neutral defaults:

- the finalized Muffin v1 default theme (`src/theme/defaults.ts`) — dark colors, Instrument Sans typography (weights 400/600/700), and a `630px` content measure, all transcribed from `DESIGN.md`
- site title `Muffin`, language `en`
- a homepage derived from `home.md` or `index.md`, aliased to `index.html`

The repository ships a small sample vault in `content/` to demonstrate nested folders, wikilinks, and backlinks. Replace it with your own content — Muffin makes no assumptions about a particular site's identity or design.

## Configuration

All configuration lives in a single optional TypeScript module `muffin.config.ts`,
typed via `defineConfig`. Every field falls back to a sensible default when
missing or unreadable.

```ts
import { defineConfig } from "muffin";

export default defineConfig({
  site: {
    title: "My Site",
    lang: "en",
    description: "Optional meta description",
    // basePath falls back to MUFFIN_BASE_PATH, then ""
  },

  content: {
    directory: "./content",
    exclude: [], // glob patterns (markdown + assets)
  },

  // Optional: basename of the source page aliased to index.html
  homepage: { page: "Home" },

  theme: {
    tokens: {
      colors: { text: "#1a1a1a", link: "#1a0dab" },
      typography: { body: "'Lora', Georgia, serif" },
    },
  },

  output: {
    directory: "./muffin",
  },
});
```

- **site** — identity metadata: `title` (default `Muffin`), `lang` (default `en`), optional `description` (rendered as a `<meta name="description">` tag), and `basePath` (defaults to `MUFFIN_BASE_PATH`, then `""`).
- **content** — `directory` (default `./content`) and `exclude` glob patterns applied to markdown and assets alike.
- **homepage** — `{ page }` basename of the source page aliased to `index.html`. When omitted, Muffin prefers `home.md`, then `index.md`; if neither exists, no `index.html` is generated.
- **theme.tokens** — semantic groups: `colors`, `typography` (incl. `sizes`), `spacing`, `layout`, and `radius`. Groups are merged per-key over the neutral defaults; site-specific styles stay out of the engine.
- **output** — `directory` (default `./muffin`).

Identity and theme are presentation, not content. The default experience is Muffin's — making a site your own is a per-site concern, not something hardcoded into the engine.

## Commands

- **Build:** `npx tsx build.ts`
- **Test:** `npm test`

## Architecture

```
muffin.config.ts                          → loadConfig() → SiteConfig (head of build, before discovery)
content/*.md
  → loadContent()            config.content.directory + exclude → LoadedContent[] + assets
  → slugMap                  slug → [candidate file paths] (supports duplicate filenames)
  → parseMarkdown()          body → shared mdast tree (wikilinks + embeds resolved once)
  → buildTargetIndex()       heading/block anchors from the parsed ASTs
  → buildSiteGraph()         forward/back links from the parsed ASTs
  → renderMarkdownTree()     same trees → HTML (GFM, KaTeX, callouts)
  → buildExplorerTree()      from relPath, no filesystem access → explorer HTML
  → createPresentationContext()  page + site identity + basePath → PresentationContext
  → renderPage()             context → HTML shell (TOC/backlinks sections); slug on <body>
  → writePages()             writes .html to config.output.directory, resolves homepage, prunes stale output
  → writeStaticAssets()      copies styles.css + generates theme.css + KaTeX assets when math present
  → copyAssets()             copies vault images/PDFs into the output
  → copyPublicAssets()       copies ./public through verbatim (project-level passthrough)
```

Pipeline order matters: config loads at the head of the build, before content
discovery, so `content.directory`/`exclude` govern what enters the pipeline and
`site.basePath` governs how links render. `loadConfig` is also what feeds theme,
homepage, and output paths. `buildSiteGraph` must run before `renderMarkdownTree`
because rendering mutates the shared markdown AST.

## Page Shell

Each page renders through `templates/page.html`. The `<body>` carries `data-slug`, `data-relpath` (the page's canonical identity, used for current-page highlighting and also read by the Explorer persistence script) and `data-base-path` scoping hooks for site CSS and storage keys. The page type concept from earlier phases was removed — Muffin does not ship site-specific page types such as "portfolio" or "home". Pages render from a generic `PresentationContext` (page + site identity + basePath), so templates never touch raw build data; the three-column layout, per-page TOC, and backlinks all follow `DESIGN.md`.

The template ships three tiny standalone client scripts (all gated so the page works without JS): one persists Explorer folder `details` state (keyed as `muffin:explorer:v1:{basePath}`), one opens the `≤899px` burger drawer, and one drives the TOC scroll-spy (`.has-spy`/`.is-passed`, `aria-current="location"`). Current-page highlighting needs no script — it is rendered per page at build time. All storage access is wrapped in try/catch so the page works even when storage is unavailable.

Template tokens: `{{TITLE}}`, `{{CONTENT}}`, `{{TOC}}`, `{{BACKLINKS}}`, `{{NAV}}`, `{{CSS}}`, `{{THEME_CSS}}`, `{{KATEX_CSS}}`, `{{PAGE_META}}`, `{{SITE_TITLE}}`, `{{LANG}}`, `{{SITE_DESCRIPTION}}`, `{{BODY_ATTRS}}`.