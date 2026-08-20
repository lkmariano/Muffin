```
content/*.md
  → getMarkdownFiles()      discovers all .md files recursively
  → getSlug()                filename → slug (lowercase, hyphenated, no extension)
  → slugMap                  slug → [candidate file paths] (supports duplicate filenames)
  → Pass 1: linkExtractor     parse + wikilinkPlugin only (mdast) → build forwardLinks
  → invert forwardLinks       → backlinks
  → Pass 2: processor         parse + wikilinkPlugin + remarkRehype + rehypeStringify → HTML
  → render()                  swaps {{TITLE}}, {{CONTENT}}, index into templates/page.html
  → writeOutput()             writes each page to muffin/, mirroring folder structure
```

### File layout

```
build.ts              — orchestration: file discovery, two-pass parseFiles(), render(), writeOutput(), entry point
utils.ts               — getSlug(filePath): pure filename → slug transform
plugins/
  wikilinks.ts         — wikilinkPlugin(slugMap, currentFile), resolveWikilink(currentFile, slug, slugMap)
templates/
  page.html            — {{TITLE}}, {{CONTENT}}, index placeholders
content/               — gitignored except .gitkeep; your real vault content goes here (kept private)
muffin/                 — gitignored build output; served via `npx serve muffin`
```
