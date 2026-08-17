Remaining items on the Muffin roadmap.

## Next up

- [ ] Separate CSS file — move styles out of the template into `templates/style.css`, linked via `<link rel="stylesheet" href="/style.css">`, copied into `muffin/` at build time.
- [ ] Solve the base-path problem — absolute paths (`/notes/foo.html`) break when served from a GitHub Pages *project* site subpath (`username.github.io/repo-name/`) rather than a domain root. Needs a configurable base path or a switch to relative links.
- [ ] Set up GitHub Pages deployment — `muffin/` is gitignored and never committed; need a GitHub Actions workflow that runs the build and deploys the output automatically on push.

## Nice to have, not blocking

- [ ] Extract the duplicated `[\s_]+` normalization regex (currently in both `utils.ts` and `wikilinks.ts`) into a shared `normalizeSlug()` helper.