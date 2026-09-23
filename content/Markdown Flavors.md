# Markdown Flavors

Muffin renders this vault with a single Markdown parser (`remark` + GFM), plus
Obsidian-style extensions: math, highlights, callouts, wikilinks, references,
and embeds. Everything below is supported in any `.md` file under `content/`.

---

## Standard Markdown

### Headings

# Heading 1
## Heading 2
### Heading 3

Each heading gets a deterministic anchor from its text so it can be linked: the
paragraph above renders as `<h1 id="heading-1">`. Duplicates get `-1`, `-2`, …
in document order.

### Emphasis & strong

*italic* or _italic_   **bold** or __bold__   ***both***

### Lists

- unordered item
1. ordered item

### Links & images

[example](https://example.com)
![alt text](img.png)

### Blockquotes

> quoted text

### Code

`inline code`

```js
const x = 1;
```

### Horizontal rules

---

## GFM (GitHub Flavored Markdown)

### Tables

| Feature   | Status  |
| --------- | ------- |
| Tables    | done    |
| Footnotes | done    |

### Strikethrough

~~deprecated~~ still here

### Task lists

- [x] ship references
- [ ] ship embeds

### Autolinks

https://example.com

URLs on their own line become clickable links.

### Footnotes

A claim worth verifying[^1].

[^1]: See the docs for details.

---

## Obsidian Flavored Markdown (OFM)

### Math (KaTeX)

Inline math with single dollars, display math with double dollars:

Inline $E = mc^2$.

Display:

$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

When the vault contains math, Muffin emits the KaTeX stylesheet site-wide and
copies the KaTeX assets into the output.

### Highlights

==text to highlight==

Renders as `<mark>text to highlight</mark>`.

### Comments

This is visible %%this is hidden%% and this is not.

Everything between `%%` and `%%` is stripped from the output.

### Callouts

Callouts are blockquotes whose first line opens with `[!type]`:

> [!note] Optional title
> Body of the callout.

> [!warning]- Collapsible, collapsed by default
> Use a `+` to start expanded instead.

- The type sets the `data-callout` attribute (`note`, `warning`, `tip`,
  `error`, `success`, … — any string works).
- Without a custom title, the type is used (capitalized).
- Fold with `[!type]-` (collapsed) or `[!type]+` (expanded).

### Backlinks

Muffin builds a site graph automatically. At the bottom of every page that other
pages link to, a "Backlinks" section lists the pages that point at it — no
frontmatter or configuration needed.

---

## Wikilinks

### Link to another page

See [[Home]] and [[notes/Usage]].

[[Some Note|with a custom label]]

The `|label` overrides the display text.

### References — heading anchors

Jump to [[Home#Heading 1]].

This resolves to the heading's anchor (e.g. `Home.html#heading-1`) and uses the
heading text as the link label unless you give a `|label`.

### References — block IDs

Give any paragraph or list item a block ID with a trailing ` ^id`:

The key paragraph. ^my-block

- A list item worth linking to ^item-block

Then reference it from anywhere:

See [[notes/Wikilinks#^my-block]].

The `^` appears in the URL (`#%5Emy-block`); the link label is the block id. The
id is stripped from the rendered paragraph text.

---

## Embeds

Obsidian `![[...]]` embeds — images and PDFs are inlined directly.

### Image embeds

![[muffin.png]]

A bare filename resolves to the matching file under `content/`, same-folder
first. Supported: `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`.

Optional width suffix:

![[muffin.png|300]]

### PDF embeds

![[manual.pdf]]

Renders as an inline `<iframe class="pdf-embed">` viewer.

An unresolved embed (no matching file) falls back to plain `![[text]]`.

---

## Frontmatter

Optional YAML frontmatter at the top of a page:

---
title: An explicit title wins over the filename
status: draft
tags:
  - quick-notes
  - reference
---

Content starts here.

- `status` is surfaced in the page footer when it is a string.
- `tags` (list or single string) are normalized to an array and shown with the
  page metadata.
- Filenames define titles; `title` in frontmatter is not used.