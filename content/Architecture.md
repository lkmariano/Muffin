```
content/*.md
  → getMarkdownFiles()       discovers all .md files recursively
  → getSlug()                 filename → slug (lowercase, hyphenated, no extension)
  → slugMap                   slug → [candidate file paths] (supports duplicate filenames)
  → Pass 1: linkExtractor     parse + wikilinkPlugin only (mdast) → build forwardLinks
                               (only nodes tagged data.isWikilink: true are counted —
                               external markdown links are skipped)
  → invert forwardLinks       → backlinks (deduped, resolved to { title, href })
  → Pass 2: processor         parse + wikilinkPlugin + remarkRehype + rehypeStringify → HTML
  → buildNav()                 groups pages by folder for the sidebar nav
  → render()                   swaps {{TITLE}}, {{CONTENT}}, {{BACKLINKS}}, {{NAV}}, {{CSS}},
                               index into templates/page.html
  → writeOutput()              writes each page to muffin/, mirroring folder structure
  → copy templates/style.css → muffin/style.css   (once per build, not per-page)
```

All hrefs (wikilinks, backlinks, nav, the stylesheet link) are passed through `withBase()`
so the site works correctly whether it's served from domain root (local dev) or a
GitHub Pages project subpath like `/muffin/` (set via `MUFFIN_BASE_PATH`).

### File layout

```
build.ts               — orchestration: file discovery, two-pass parseFiles(), buildNav(),
                          render(), renderNav(), writeOutput(), entry point
util.ts                 — getSlug(filePath), getTitle(filePath): pure filename → slug/title transforms
basePath.ts             — BASE_PATH constant (from MUFFIN_BASE_PATH env var) + withBase() helper
plugins/
  wikilinks.ts          — wikilinkPlugin(slugMap, currentFile), resolveWikilink(currentFile, slug, slugMap)
                          tags generated link nodes with data.isWikilink: true
templates/
  page.html             — {{TITLE}}, {{CONTENT}}, {{BACKLINKS}}, {{NAV}}, {{CSS}} placeholders
  style.css             — single global stylesheet, copied to muffin/ at build time
content/                — gitignored except .gitkeep; your real vault content goes here (kept private)
muffin/                  — gitignored build output; served via `npx serve muffin`
```

### Known gaps (not yet fixed)

- **No image support.** Standard markdown images (`![alt](path)`) would render as `<img>`
  tags correctly, but nothing copies image files from `content/` into `muffin/`, so they'd
  404. Obsidian-style `![[image.png]]` embeds aren't handled at all — `wikilinkPlugin`
  would try to resolve them against `slugMap`, which only contains markdown files.
- **Nav is one level deep.** `buildNav()` groups pages by their immediate parent folder as
  a flat string key — it doesn't build a true nested tree, so deeply nested folders don't
  render as a proper recursive file-tree explorer yet.
