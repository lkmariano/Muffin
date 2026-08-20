A barebones static site generator built in Node.js + TypeScript for Obsidian vaults, supporting nested folders, wikilinks, and backlinks.

## Status: Core pipeline working end-to-end

You can currently: point it at a `content/` folder of markdown files, resolve `[[wikilinks]]` against real files (including nested folders, with same-folder-first tie-breaking), compute backlinks, render pages through an HTML template, and write real `.html` files to `muffin/` that you can serve locally and click through.

[[architecture]]
[[todo]]
Version Control
Future Updates
