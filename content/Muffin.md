A barebones static site generator built in Node.js + TypeScript for Obsidian vaults, supporting nested folders, wikilinks, and backlinks.

[Find the Github Link Here!](https://github.com/lkmariano/Muffin)

## Status: Core pipeline working end-to-end, with nav sidebar + backlinks sidebar

You can currently: point it at a `content/` folder of markdown files, resolve `[[wikilinks]]` against real files (including nested folders, with same-folder-first tie-breaking), compute deduped backlinks, render pages through a 3-column HTML template (nav / content / backlinks), and write real `.html` files to `muffin/` that you can serve locally and click through.

- [[Architecture]]
- Todo
- Version Control
- [[Future Updates]]
