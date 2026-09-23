# AGENTS.md — Muffin

A barebones static site generator for Obsidian vaults (markdown → HTML) built in
Node.js + TypeScript. Single entrypoint: `build.ts`.

This file describes the current codebase — structure, commands, and conventions.
The design philosophy and architectural direction live in `ARCHITECTURE.md`.

## Build & Verify

- **Build command:** `npx tsx build.ts` (tsx runs TS directly — no compile step)
- **Test command:** `npm test` (runs `vitest run`)
- **Verification loop:** After every file change, run the build and tests. If
  either fails, fix the error and re-run. DO NOT mark work complete while
  the build or tests throw.

## Architecture Rules

Modular Monolith with a strictly unidirectional dependency pipeline:

```
Configuration → Content → Transformers → Site Graph → Renderer → Output
```

Site identity and paths come from compile-time constants in `src/site.ts`
(`SITE`, `CONTENT_DIRECTORY`, `EXCLUDE_GLOBS`, `HOMEPAGE`, `OUTPUT_DIRECTORY`),
not a runtime config file. The build-time knobs are the `MUFFIN_BASE_PATH` and
`MUFFIN_SITE_URL` environment variables, both read at call time by `basePath.ts`
(`withBasePath()` prefixes all generated URLs — internal links, asset embeds,
CSS/KaTeX hrefs, `<body data-base-path>`; `resolveSiteUrl()` resolves the site
origin used by RSS/sitemap output, falling back to the compile-time `SITE.url`).
`SITE` + the base path feed the renderer, and `HOMEPAGE` + `OUTPUT_DIRECTORY`
feed output.

- **Content boundary:** `src/content/loader.ts` is the only module that
  discovers and reads source-vault files; `loadContent(directory, exclude)`
  emits `LoadedContent[]` + `LoadedAsset[]` + `slugMap` (exclude globs apply to
  markdown and assets alike) with a validated root-relative `relPath`. Other
  layers consume that output rather than accessing `./content` directly.
- **Renderer restriction:** code in rendering/layout layers MUST NOT import `fs`
  or perform direct filesystem operations.
- **Data isolation:** keep data parsing/page-structure definitions entirely
  separate from HTML generation.
- **Composition root:** `build.ts` wires discovery → parse → graph → render →
  output and assembles `Page` objects + `PresentationContext`s; it must not own
  the implementation of those stages.
- **Page model:** everything maps to a structured `Page` object —
  `{ path, relPath, slug, title, metadata, content, backlinks?, toc }`, with
  `Backlink = { title, href }`, `TocEntry = { depth, text, id }`, and
  `PageMetadata = { frontmatter, status?, updated, tags }`. Title precedence:
  an explicit non-empty string `frontmatter.title` wins, otherwise it falls
  back to the filename-derived title via `getTitle` (`resolvePageTitle` in
  `src/content/frontmatter.ts`). `updated` is the file mtime
  formatted as `YYYY-MM-DD` in the domain model, then rendered in the
  page-meta as a human-readable date (e.g. `Sep 21, 2026`, no "Updated "
  prefix) by `formatDisplayDate` in `src/rendering/page.ts`; `status` is
  surfaced only when `frontmatter.status` is a string. Frontmatter `tags` accept every YAML shape the vault may use — single string, block list, flow list (`[a, b]`), quoted `"#tag"`, Obsidian-style `#tag` in block/flow/scalar positions, and empty (`[]`/`null`/absent) — hash-prefixed scalars are quoted before YAML parse in `loader.ts`, then leading `#` stripped/whitespace-trimmed/duplicates removed via `normalizeTags`), and are normalized to
  `tags: string[]` in page metadata via `normalizeTags`
  (`src/content/frontmatter.ts`); `tags` is always present (empty array when no
  tags exist), rendered as muted Obsidian-style `#tags` beside the date in the page-meta. Arbitrary frontmatter (e.g. `type`) is preserved verbatim in
  `Page.metadata.frontmatter` and opaque to core — no page-type interpretation,
  rendering branches, or registries. No inline `#tags`, tag pages, tag index,
  tag navigation, or tag graph exists yet. Do not pass raw strings between
  modules.
  The domain `Page` model lives in `src/domain/page.ts`.
- **Page identity:** the root-relative `relPath` is the canonical identity for
  the TargetIndex and SiteGraph (and backlink keys) — NOT `getSlug`. Pages with
  duplicate basenames in different directories stay distinct. `slug` remains for
  URLs and `<body data-slug>` only; `relPath` also lands on `<body
  data-relpath>` and feeds Explorer current-page highlighting. All relPath values originate from
  `loadContent`'s `requireRelPath` (same `path.relative` output feeds
  `content.relPath` and `slugMap`), so index/graph lookups always use
  identically-produced strings.

  (These rules follow the principles in `ARCHITECTURE.md` §1.)

## Architecture Reference

`ARCHITECTURE.md` is Muffin's design philosophy and architectural direction — it
describes principles, not the current code (AGENTS.md documents the current state).

Consult it when planning:
- an architectural/refactoring change
- adding or changing module boundaries
- changing dependency direction
- introducing a new page type, pipeline stage, or shared domain model

Skip it for routine bug fixes, small local changes, or unrelated tasks.

## Planning Output

For architectural/refactoring plans, return:
1. Responsibility of the new module
2. Minimal API/signature
3. Relevant dependencies/imports
4. Verification plan

## TypeScript Strictness

`tsconfig.json` enables strict flags that commonly trip agents up:

- `verbatimModuleSyntax` — use `import type` for type-only imports.
- `noUncheckedIndexedAccess` — array/object indexing yields `T | undefined`.
- `exactOptionalPropertyTypes` — `?:` means "missing or exact type", not
  "missing or undefined".

`lib` includes `dom`/`dom.iterable` so the jsdom browser tests typecheck; the
builder's renderer code still MUST NOT use DOM APIs at runtime.

## Structure

| Path | Purpose |
|------|---------|
| `build.ts` | composition root (paths from `src/site.ts` constants resolved against `PROJECT_ROOT`) — exports `assemblePages()` (the reusable Content → Page boundary: discovery → parse → graph → `Page[]` assembly, no output writes, `AssembleResult` `{ pages, contents, assets, hasMath }` exposes assembled data, not AST/pipeline state) and `build({ renderer? })` (the high-level build command: assemble → render each page through the `PageRenderer` — default `renderSitePage` — → `writePages` + static/syndication assets + `public/` copy). Auto-runs only when executed directly (`is-main-module` guard), so `import { build, assemblePages } from "./build.ts"` is side-effect-free for external site compositions |
| `./content/*.md` | default sample vault (nested folders supported) + image assets — replace with your own content |
| `./templates/page.html` | HTML shell with `{{PLACEHOLDER}}` tokens + a `<head>` `js`-class script (pre-paint) and three inline client scripts (Explorer state persistence, the burger drawer, and the scroll-listener TOC scroll-spy; current-page highlighting is server-rendered, no script). Body includes the mobile top bar (`header.topbar` with `#nav-toggle`) + `#nav-backdrop`, and `<nav id="site-nav">` |
| `./templates/styles.css` | self-contained global stylesheet — Google Fonts `@import` (first rule) + the full Muffin v1 token set in `:root` (colors, Instrument Sans typography 400/600/700, spacing 1–7, layout columns nav 190px / main 700px with one top edge `pageTop`, radius 0), CSS variable layout + state rules: `:focus-visible` ring, current-page Explorer note/folder, TOC `has-spy`/`is-passed`, one-top-edge grid (`align-items: first baseline` at `--layout-page-top`), compact 15px/2px Explorer tree with aligned root notes, 1px-stroke SVG chevrons in 25px/15px boxes, the collapsible TOC `<details>` header (with `:has()` collapse spacing), and the `<899px` burger/drawer nav (`.js`-gated) |
| `./public/` | project-level static passthrough — contents copied verbatim into the output root by `copyPublicAssets()` (never parsed/transformed as Markdown); empty/missing dir is a no-op |
| `./src/site.ts` | build-time site constants: `SiteIdentity` type (`{ title, lang, url? }` — no `basePath`/`description` keys), `SITE`, `CONTENT_DIRECTORY`, `EXCLUDE_GLOBS`, `HOMEPAGE`, `OUTPUT_DIRECTORY` |
| `./src/content/` | sole source-vault boundary: discovery/read + frontmatter parse (`loader.ts` → `loadContent(directory, exclude)` → `LoadedContent` `{ path, relPath, frontmatter, body, mtime }` + `LoadedAsset[]` for images + PDFs + `slugMap`); frontmatter normalization + title precedence (`frontmatter.ts` → `normalizeTags`/`resolvePageTitle`); markdown parse/render (`markdown.ts` — `parseMarkdown` + `renderMarkdownTree`; `renderMarkdown` is a test-only convenience; GFM, math, highlights/comments, callouts, and heading/block anchors handled in-repo here); heading IDs + block IDs (`anchors.ts` — pure slugging/ID assignment, no fs); reference target index + fragment resolution (`targets.ts` — `buildTargetIndex`/`resolveReferenceFragments`, relPath-keyed, no fs); build-time TOC extraction (`toc.ts` — `extractToc`, depth 1–3, data only, no HTML) |
| `./src/graph/` | backlink graph (`backlinks.ts`, relPath-keyed; `resolveBacklinks(graph, relPath)`) + explorer tree (`navigation.ts`, built from `LoadedContent.relPath` — no filesystem access) |
| `./src/domain/` | models: `page.ts` (`Page`, `Backlink`, `TocEntry`, `PageMetadata`), `siteGraph.ts` (`SiteGraph`), `explorer.ts` (`ExplorerNode`) |
| `./src/rendering/` | pure HTML generation — `context.ts` (`PresentationContext` + `createPresentationContext(page, site, explorerHtml, { hasMath, rssHref })` + the `PageRenderer` contract `(context, template) => string` — the per-page presentation extension point injected at the composition root; consumers may interpret arbitrary frontmatter there, Muffin stays opaque), `page.ts` (`renderPage(context, template)` — Muffin's base page-shell renderer; body attrs `data-slug`/`data-relpath`/`data-base-path` from the `MUFFIN_BASE_PATH` env; RSS alternate link from `rssHref`; TOC rendered as a collapsible `<details>` with an `aside-chevron` SVG, backlinks under `h2.aside-title`, mtime date displayed human-readable), `explorer.ts` (`renderExplorer(nodes, currentRelPath?)` — `data-explorer-path` on files, `data-folder-path` on folders, SVG folder chevrons, `aria-current="page"` + `explorer-current` on the matching file, `explorer-active-folder` on ancestor folders, attribute escaping; hrefs base-pathed via `withBasePath`) — no `fs` imports |
| `./src/presentation/` | the shipped site presentation seam — `renderSitePage.ts` (`renderSitePage`, Muffin's default `PageRenderer`: a transparent pass-through of `renderPage` that `build()` uses by default; the doc comment is the guided place for a site to branch on `context.page.metadata.frontmatter.type` — Muffin core interprets nothing) |
| `./src/output/` | file writing + stale-output pruning (`writer.ts`), static assets + KaTeX + vault-asset copying + public passthrough + feed/sitemap gating (`assets.ts`: `writeStaticAssets({ outputRoot, hasMath })`/`copyAssets`/`copyPublicAssets`/`writeSyndication({ outputRoot, feedXml, sitemapXml })`), RSS + sitemap generation (`syndication.ts` — `renderRssFeed`/`renderSitemap`, pure, no fs, `Page[]` + origin only; no filtering/rediscovery, arbitrary frontmatter is opaque), template loading (`templates.ts`) |
| `./plugins/` | `wikilinks.ts` (target resolution + URL construction, incl. `[[note#Heading]]`/`[[note#^block-id]]` fragment parsing) and `image-embeds.ts` (Obsidian `![[...]]` embeds — image + PDF syntax, resolution, and base-path-aware URLs) |
| `./tests/` | vitest unit + integration tests, shared helpers |
| `./muffin/` | build output (gitignored) |
| `ARCHITECTURE.md` | design philosophy + architectural direction — not current-state documentation |
| `basePath.ts` | `withBasePath()` — URL prefixing from `MUFFIN_BASE_PATH` (read at call time; `BASE_PATH` const unused); `resolveSiteUrl()` — site origin from `MUFFIN_SITE_URL` (read at call time) falling back to the argument (build passes `SITE.url`); trailing slashes stripped |
| `util.ts` | slug/title/date/path helpers (`getSlug`, `getTitle`, `formatDate`, `formatRfc822`, `toHtmlPath`) |
| `vitest.config.ts` | vitest configuration |

## Tests

`npm test` (vitest run). Unit specs mirror the pipeline modules; integration
tests run the pipeline end-to-end on temp dirs via `tests/helpers.ts`
(`makeTempDir`/`writeFile`/`cleanupTempDir`).

- `tests/unit/` — `loader`, `markdown`, `frontmatter`, `wikilinks`, `anchors`,
  `targets`, `backlinks`, `explorer`, `writer`,
  `asset-copy`, `page-renderer`, `callouts`, `gfm`, `ofm`, `image-embeds`,
  `pdf-embeds`, `util`, `basePath`, `toc`, `build-entrypoint` (hermetic:
  importing `build.ts` runs no pipeline and writes nothing; `assemblePages()`
  returns fully-assembled `Page[]` over the sample vault), plus `browser/`
  (`explorer-behavior`, `toc-spy`) — jsdom-based behavior tests that load real
  rendered pages (`templates/page.html` + `renderPage`) with `runScripts:
  "dangerously"` and execute the production inline scripts; `matchMedia` and
  `requestAnimationFrame` are stubbed via `tests/unit/browser/helpers.ts`.
  Base-path behavior is exercised by setting/restoring
  `process.env.MUFFIN_BASE_PATH` (read at call time) via an `afterEach` restore.
- `tests/integration/` — `pipeline` (discovery → graph → render)

## Pipeline Flow

```
(compile-time site constants + MUFFIN_BASE_PATH/MUFFIN_SITE_URL env → src/site.ts + basePath.ts)
  → loadContent(SITE dirs: CONTENT_DIRECTORY resolved against PROJECT_ROOT, EXCLUDE_GLOBS)  → src/content/loader.ts
  → recursive getMarkdownFiles → LoadedContent[]
  → slugMap: slug → candidate relPaths (supports duplicate filenames)
  → parseMarkdown: body → mdast (remarkParse + GFM + math + wikilink/OFM plugins) once per file → src/content/markdown.ts
  → buildTargetIndex (page → heading/block anchors, from parsed ASTs) → src/content/targets.ts
  → resolveReferenceFragments (writes #anchor URLs on reference links) → src/content/targets.ts
  → buildSiteGraph (forward/back links, relPath-keyed) from the parsed ASTs → src/graph/backlinks.ts
  → extractToc (direct H1–H3 root headings, real heading IDs) → src/content/toc.ts
  → renderMarkdownTree → HTML (GFM + KaTeX math + callouts; rehype-stage, from the same parsed ASTs) → src/content/markdown.ts
  → buildExplorerTree (from LoadedContent.relPath, no fs)       → src/graph/navigation.ts
  → renderExplorer (nodes, page.relPath) per page → NAV html (current page + active folders marked; hrefs base-pathed) → src/rendering/explorer.ts
  → createPresentationContext (page + site identity + explorer + hasMath + rssHref) → src/rendering/context.ts
  → PageRenderer (context + template → HTML shell; Muffin default `renderSitePage` — a pass-through of `renderPage`; consumers inject their own at the composition root) → src/presentation/renderSitePage.ts
  → writePages + writeStaticAssets (self-contained styles.css; katex assets via copyKatexAssets) + writeSyndication (feed.xml/sitemap.xml via renderRssFeed/renderSitemap, gated on an origin) + copyAssets (vault images/PDFs) + copyPublicAssets (./public passthrough) → src/output/writer.ts + assets.ts + syndication.ts
  → ./muffin/ (mirrors folder structure)
```

The first five stages (through renderMarkdownTree) are wrapped by `assemblePages()`
— the reusable Content → Page boundary returning `{ pages, contents, assets,
hasMath }`; `build({ renderer? })` composes that with rendering + output. Both
live in `build.ts`, which auto-runs only when executed directly, so an external
site composition can `import { build, assemblePages } from "./build.ts"`,
interpret arbitrary `Page.metadata.frontmatter` values (e.g. `type: writings`)
through its own `PageRenderer`, and fall back to `renderPage` for everything
else — Muffin never interprets those values. In-repo, `build()` routes every
page through the shipped default `renderSitePage` (`src/presentation/`) — a
pass-through of `renderPage` with a doc comment showing where to branch on
`frontmatter.type` for the site's own layouts.

- **Single parse + rendering mutates the tree:** each body is parsed once into a
  shared mdast tree (`parseMarkdown` resolves wikilinks into `link` nodes,
  assigning heading + block IDs). Target discovery and fragment resolution
  (`buildTargetIndex` → `resolveReferenceFragments`, from the same parsed ASTs)
  run BEFORE graph construction; `renderMarkdownTree` then rewrites wikilink URLs
  to final hrefs and hastifies the same trees. Graph construction, reference
  resolution, and TOC extraction MUST run before content rendering — rendering
  mutates the shared AST.
- **Slug:** `basename(filename, .md)` lowercased, spaces/underscores → hyphens.
- **Heading IDs:** `headingIdPlugin` (`src/content/anchors.ts`) assigns each
  heading a slug from its text (Unicode lowercase; non-letter/digit/whitespace
  chars dropped; whitespace collapsed to `-`; leading/trailing `-` trimmed; empty
  falls back to the raw heading text); duplicates get `-1`, `-2`, … in document
  order. IDs are stored in `data.headingId` and mirrored on the hast node.
- **Block IDs:** trailing ` ^<id>` (id: `[A-Za-z0-9_-]+`) strips the marker and
  anchors the block — paragraphs (or their parent list item) get
  `id="^<id>"`. The caret lives only in the HTML/fragment; the logical id is
  stored without it (`data.blockId`). First duplicate wins; later duplicates are
  stripped but not anchored. Headings are never block-anchored.
- **TOC:** `extractToc` (`src/content/toc.ts`) walks only the root's direct
  heading children (depths 1–3), reads the exact `data.headingId` assigned by
  the heading-ID pipeline (empty string when missing; no generation,
  normalization, or dedup), and flattens heading text via `mdast-util-to-string`.
  `renderPage` turns the data into a collapsible `<details>` (`.toc` wrapper,
  `{{TOC}}`) with an SVG `aside-chevron` and the aside's `.toc-list`, with
  `#<id>` fragment links and depth classes for indentation.
- **References:** `[[note#Heading]]`/`[[note#^block-id]]` keep their fragment on
  the link node (`data.fragmentTarget`), then `resolveReferenceFragments` writes
  the final `#anchor` (percent-encoded `%5E` for blocks in hrefs) via
  `data.finalFragment` — the wikilink's `url` is already the resolved
  root-relative path and keys the TargetIndex directly. Unresolved fragments are
  preserved (normalized `#missing-heading`, `#^missing-block`); unresolved
  whole-page links fall back to plain text.
- **Wikilink resolution:** duplicate filenames resolve same-folder-first, walking
  up the directory tree for precedence (`plugins/wikilinks.ts`).
- **Base path:** every generated URL (wikilink hrefs, image/PDF embeds,
  explorer links, `styles.css`/`katex.min.css` links, `<body data-base-path>`)
  is prefixed with `withBasePath(url, process.env.MUFFIN_BASE_PATH ?? "")`. The
  env is read at call time, so tests set/restore it per-case. `data-base-path`
  keys the Explorer localStorage namespace (`muffin:explorer:v1:{basePath}`).
- **Homepage:** `HOMEPAGE` (`src/site.ts`, default `"Home"`) names the source page
  (by basename) aliased to `index.html`; handled in `writePages()`
  (`src/output/writer.ts`). With `HOMEPAGE` set to a page that doesn't exist,
  `writePages()` falls back to `home.md`, then `index.md` (basename match,
  case-insensitive); if neither exists, no `index.html` is generated.
  `writeStaticAssets()` copies the self-contained `styles.css` verbatim, plus
  KaTeX assets when the vault contains math (a stale `katex/` dir is removed
  when it does not); `copyAssets()` copies vault images/PDFs into the output;
  `copyPublicAssets()` copies a project-level `public/` directory through
  verbatim (empty/missing is a no-op). `writePages()` also prunes stale `.html`
  output so `./muffin/` mirrors the current content set
  (`src/output/writer.ts` + `src/output/assets.ts`). `writeSyndication()` writes
  `feed.xml`/`sitemap.xml` when an origin resolves (`MUFFIN_SITE_URL` env or
  `SITE.url`; absent/empty keeps both disabled and prunes any stale copies);
  both files carry absolute URLs composed as `origin + withBasePath("/" +
  toHtmlPath(relPath))`.
- **Template tokens:** `{{TITLE}}`, `{{CONTENT}}`, `{{TOC}}`, `{{BACKLINKS}}`,
  `{{NAV}}`, `{{CSS}}`, `{{KATEX_CSS}}`, `{{RSS_LINK}}`, `{{PAGE_META}}`,
  `{{TAGS}}`, `{{SITE_TITLE}}`, `{{LANG}}`, `{{SITE_DESCRIPTION}}`,
  `{{BODY_ATTRS}}`
  (`data-slug`/`data-relpath`/`data-base-path`). `{{CSS}}` is
  `<link rel="stylesheet" href=".../styles.css">` base-pathed via
  `withBasePath`. `{{TOC}}` renders a collapsible `<details>` wrapper (SVG
  `aside-chevron`, `.toc-list`) and `{{BACKLINKS}}` renders a `h2.aside-title`
  + `.backlinks-list` — both empty strings when the page has no entries/links.
  `{{PAGE_META}}` renders the status + updated-date spans and `{{TAGS}}` the
  muted Obsidian-style `.page-tags` row beside the date (each empty string when
  absent) — the template owns their `.page-meta` flex wrapper.
  `{{KATEX_CSS}}` is replaced by the complete stylesheet
  `<link rel="stylesheet" href=".../katex/katex.min.css">` (base-pathed via
  `withBasePath`) only when the vault contains math; otherwise it resolves to an
  empty string and the KaTeX assets are not emitted. Math presence is a site-wide
  flag computed in `parseFiles` via `containsMath` over the parsed mdast trees
  (`src/content/markdown.ts`). `{{RSS_LINK}}` is `<link rel="alternate"
  type="application/rss+xml" …>` pointing at `origin + withBasePath("/feed.xml")`
  (threaded through `PresentationContext.rssHref`) only when an origin resolves;
  otherwise it is an empty string.
- **Client scripts (no-build behavior):** `templates/page.html` ships three
  small scripts. The Explorer script persists folder `details` open state under
  the key `muffin:explorer:v1:{body[data-base-path]|"/"}` (`{ folders: {<relPath>:
  bool} }`); folder state is keyed by `data-folder-path`, updates on the native
  `toggle` event, all storage access is try/catch-guarded (page works when
  storage is unavailable), and `aria-expanded` on the toggle button always
  mirrors "all folders open" (folders start closed; the button toggles them all).
  The burger script (`.js`-gated on `window.matchMedia`) opens `<899px` the
  off-canvas `#site-nav` drawer from the `#nav-toggle` top-bar button: toggles
  `.is-open` on nav + backdrop, `aria-expanded`, and `body.nav-locked`, locks
  scroll, focuses the first focusable inside, closes on backdrop click / Escape /
  clicking a link, and closes when the media query leaves the mobile range. The
  scroll-spy runs a scroll/rAF listener over `.toc-list a[href^="#"]` headings
  (first link wins for duplicate ids; missing headings are skipped): it adds
  `.has-spy` to the list (dims every entry to 50%), then `.is-passed` to each
  heading above the 30% viewport line (100% again), marks the last passed entry
  with `aria-current="location"`, and falls back to passing everything at page
  bottom; without `requestAnimationFrame` the initial `update()` still runs.
  All three run from jsdom behavior tests under `tests/unit/browser/` loading
  the real `templates/page.html` + `renderPage` (burger + spy get stubbed
  `matchMedia`/`requestAnimationFrame` via `tests/unit/browser/helpers.ts`);
  current-page highlighting is build-time only and needs no script.

## Deployment

`.github/workflows/deploy.yaml` builds and deploys to GitHub Pages on push to
`main`, with `MUFFIN_BASE_PATH: /Muffin` and
`MUFFIN_SITE_URL: https://${{ github.repository_owner }}.github.io` set in
CI (consumed by `withBasePath` and `resolveSiteUrl`, respectively). The base
path carries the `/Muffin` sub-path; the site URL is the bare origin, so
feed/sitemap URLs compose as `origin + basePath + path` without duplication.