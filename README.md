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
- emit an RSS 2.0 `feed.xml` and an XML `sitemap.xml` when a site origin is configured (`SITE.url` / `MUFFIN_SITE_URL`), with absolute, base-path-aware URLs per page
- persist Explorer folder state across visits (`localStorage`, scoped per `basePath`)
- highlight scrolled-through TOC headings (dimmed until passed) with an on-page scroll-spy
- collapse the Explorer into a `≤899px` off-canvas drawer nav with a burger button on the top bar
- mark keyboard focus site-wide and give `focus-visible` a visible ring

## Zero Configuration

Muffin works with no configuration at all. Site identity and paths are
compile-time constants in `src/site.ts`, and the build-time knobs are the
`MUFFIN_BASE_PATH` environment variable (GitHub Pages sub-path prefixing) and
the `MUFFIN_SITE_URL` environment variable (site origin enabling
`feed.xml`/`sitemap.xml`); `MUFFIN_SITE_URL` falls back to `SITE.url`, which is
`""` by default (feeds disabled):

- the full Muffin v1 theme lives in the self-contained `templates/styles.css`
  (dark colors, Instrument Sans typography 400/600/700, `630px` content measure)
- site title `Muffin`, language `en`
- a homepage derived from `Home.md` (falling back to `home.md`/`index.md`),
  aliased to `index.html`

The repository ships a small sample vault in `content/` to demonstrate nested folders, wikilinks, and backlinks. Replace it with your own content — Muffin makes no assumptions about a particular site's identity or design.

## Configuration

There is no configuration file. Everything lives in `src/site.ts`:

```ts
export const SITE = { title: "Muffin", lang: "en", url: "" };
export const CONTENT_DIRECTORY = "./content";
export const EXCLUDE_GLOBS: string[] = [];
export const HOMEPAGE = "Home"; // basename of the page aliased to index.html
export const OUTPUT_DIRECTORY = "./muffin";
```

`url` is the site origin used for absolute RSS/sitemap URLs (`""` keeps feeds
disabled); `MUFFIN_SITE_URL` overrides it at build time. Change the constants to
point at your vault and site; the GitHub Pages workflow (`deploy.yaml`) sets
`MUFFIN_BASE_PATH: /Muffin` and
`MUFFIN_SITE_URL: https://${{ github.repository_owner }}.github.io/Muffin` so all
generated URLs are prefixed for a sub-path deployment and the feed runs on the
deployed origin.

## Commands

- **Build:** `npx tsx build.ts`
- **Test:** `npm test`

## Architecture

```
(compile-time constants in src/site.ts + MUFFIN_BASE_PATH/MUFFIN_SITE_URL env)
content/*.md
  → loadContent()            CONTENT_DIRECTORY + EXCLUDE_GLOBS → LoadedContent[] + assets
  → slugMap                  slug → [candidate file paths] (supports duplicate filenames)
  → parseMarkdown()          body → shared mdast tree (wikilinks + embeds resolved once)
  → buildTargetIndex()       heading/block anchors from the parsed ASTs
  → buildSiteGraph()         forward/back links from the parsed ASTs
  → renderMarkdownTree()     same trees → HTML (GFM, KaTeX, callouts)
  → buildExplorerTree()      from relPath, no filesystem access → explorer HTML
  → createPresentationContext()  page + SITE + explorer → PresentationContext
  → renderPage()             context → HTML shell (TOC/backlinks sections); slug/relpath/base-path on <body>
  → writePages()             writes .html to OUTPUT_DIRECTORY, resolves HOMEPAGE, prunes stale output
  → writeStaticAssets()      copies the self-contained styles.css + KaTeX assets when math present
  → writeSyndication()       feed.xml/sitemap.xml via renderRssFeed/renderSitemap when an origin resolves
  → copyAssets()             copies vault images/PDFs into the output
  → copyPublicAssets()       copies ./public through verbatim (project-level passthrough)
```

Pipeline order matters: site constants and the `MUFFIN_BASE_PATH`/`MUFFIN_SITE_URL`
envs are the only inputs. `withBasePath` reads the env at call time, so every
generated URL (wikilink hrefs, asset embeds, explorer links, styles.css/KaTeX
hrefs, and the `<body data-base-path>` scoping hook) picks it up uniformly;
`resolveSiteUrl` does the same for the RSS/sitemap origin. `buildSiteGraph`
must run before `renderMarkdownTree` because rendering mutates the shared
markdown AST.

## Page Shell

Each page renders through `templates/page.html`. The `<body>` carries `data-slug`, `data-relpath` (the page's canonical identity, used for current-page highlighting and also read by the Explorer persistence script) and `data-base-path` (the `MUFFIN_BASE_PATH` env, scoping storage keys). The page type concept from earlier phases was removed — Muffin does not ship site-specific page types such as "portfolio" or "home". Pages render from a generic `PresentationContext` (page + `SITE` + explorer HTML), so templates never touch raw build data — the three-column layout, per-page TOC, and backlinks are defined entirely by the template, the stylesheet, and the page model.

The template ships three tiny standalone client scripts (all gated so the page works without JS): one persists Explorer folder `details` state (keyed as `muffin:explorer:v1:{basePath}`), one opens the `≤899px` burger drawer, and one drives the TOC scroll-spy (`.has-spy`/`.is-passed`, `aria-current="location"`). Current-page highlighting needs no script — it is rendered per page at build time. All storage access is wrapped in try/catch so the page works even when storage is unavailable.

Template tokens: `{{TITLE}}`, `{{CONTENT}}`, `{{TOC}}`, `{{BACKLINKS}}`, `{{NAV}}`, `{{CSS}}`, `{{KATEX_CSS}}`, `{{RSS_LINK}}`, `{{PAGE_META}}`, `{{SITE_TITLE}}`, `{{LANG}}`, `{{SITE_DESCRIPTION}}`, `{{BODY_ATTRS}}`.