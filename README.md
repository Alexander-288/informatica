# informatica

One repository for every informatics project, with a GitHub Pages gallery in front of it.

**Live gallery:** https://alexander-288.github.io/informatica/

## Layout

```
.
├── index.html              entry page (text + Continue into the gallery)
├── gallery.html            gallery page (reads projects.json)
├── index-of.html           keyboard-navigable file tree (reads tree.json)
├── projects.json           generated index, committed to the repo
├── tree.json               generated file tree, committed to the repo
├── assets/site.css         shared styling for every page
├── assets/theme.js         shared light/dark toggle
├── scripts/build-gallery.mjs   scanner that regenerates projects.json
├── scripts/build-tree.mjs      scanner that regenerates tree.json
└── squareRoot/             project 01
    ├── index.html          the live demo
    ├── card.svg            its artwork on the gallery timeline
    └── project.json        its metadata
```

## Adding a project

1. Create a folder, e.g. `binarySearch/`.
2. Put an `index.html` in it if it has a live demo. It can use `../assets/site.css` and `../assets/theme.js` for the shared look and the theme toggle.
3. Add a `project.json`:

```json
{
  "title": "Binary Search",
  "description": "One sentence about what it does.",
  "tags": ["javascript", "algorithms"],
  "status": "wip",
  "pattern": "steps"
}
```

4. Optionally drop a `card.svg` in the folder. It is inlined into the gallery card and
   deliberately hangs over the card's edge, so draw it on a square viewBox and let it
   breathe. Use `currentColor` for the ink and `class="accent"` on any shape that should
   take the project's accent colour - that way it follows the light/dark theme. Without
   one, the gallery generates a block composition from the folder name instead.

5. Push. The **Build gallery and file index** workflow runs `scripts/build-gallery.mjs` and
   `scripts/build-tree.mjs`, regenerates `projects.json` and `tree.json`, and commits them back
   if anything changed. The gallery picks it up on the next load.

To preview locally before pushing:

```bash
node scripts/build-gallery.mjs
python -m http.server 8000
```
or just use a VScode extension like live server
> whatever tickles your fancy

### project.json fields

| field | required | notes |
| --- | --- | --- |
| `title` | no | defaults to the folder name |
| `description` | no | shown on the card |
| `tags` | no | become the filter buttons on the gallery |
| `status` | no | `done`, `wip`, or `idea` (default `wip`); sets the node style on the timeline |
| `pattern` | no | the background pattern behind the card's row: `converge`, `grid`, `dither`, `rings`, `bars`, `steps`, `braces`, `dots`. Picked from the tags, then from the folder name, if unset |
| `graphic` | no | path to the card artwork inside the folder; `card.svg` is picked up automatically |
| `accent` | no | hex colour for the card's left edge |
| `demo` | no | defaults to the folder if it has an `index.html` |
| `source` | no | defaults to the folder |
| `updated` | no | `YYYY-MM-DD`; controls sort order, defaults to the file's mtime |

### Editing the index by hand

The generator overwrites `projects.json` on every push, so edits there are normally lost. The one
exception is an entry with `"manual": true` and a slug that no folder claims. Those are preserved, so
an external or non-folder project can be pinned into the gallery:

```json
{ "manual": true, "slug": "arduino-clock", "title": "Arduino clock",
  "description": "Lives in a different repo.", "tags": ["hardware"],
  "status": "done", "demo": "https://github.com/Alexander-288/arduino-clock" }
```

For anything that does live in a folder, edit its `project.json` instead.

## GitHub Pages

Pages serves from the `main` branch, repository root. `.nojekyll` is present so folders and files
starting with an underscore are not stripped.
