# Muffin

A barebones static site generator built in Node.js + TypeScript for Obsidian vaults, supporting nested folders, wikilinks, and backlinks.

## Status: Core pipeline working end-to-end

You can currently: point it at a `content/` folder of markdown files, resolve `[[wikilinks]]` against real files (including nested folders, with same-folder-first tie-breaking), compute backlinks, render pages through an HTML template, and write real `.html` files to `muffin/` that you can serve locally and click through.

---

## Architecture

```
content/*.md
  → getMarkdownFiles()      discovers all .md files recursively
  → getSlug()                filename → slug (lowercase, hyphenated, no extension)
  → slugMap                  slug → [candidate file paths] (supports duplicate filenames)
  → Pass 1: linkExtractor     parse + wikilinkPlugin only (mdast) → build forwardLinks
  → invert forwardLinks       → backlinks
  → Pass 2: processor         parse + wikilinkPlugin + remarkRehype + rehypeStringify → HTML
  → render()                  swaps {{TITLE}}, {{CONTENT}}, {{BACKLINKS}} into templates/page.html
  → writeOutput()             writes each page to muffin/, mirroring folder structure
```
