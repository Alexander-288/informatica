# informatica

One repository for every informatics project, with a GitHub Pages gallery in front of it.

**Live gallery:** https://alexander-288.github.io/informatica/

## Layout

```
.
├── index.html              gallery page (reads projects.json)
├── projects.json           generated index, committed to the repo
├── assets/site.css         shared styling for the gallery and project pages
├── scripts/build-gallery.mjs   scanner that regenerates projects.json
└── squareRoot/             project 01
    ├── index.html          the live demo
    └── project.json        its metadata
```

## Adding a project

1. Create a folder, e.g. `binarySearch/`.
2. Put an `index.html` in it if it has a live demo. It can use `../assets/site.css` for the shared look.
3. Add a `project.json`:

```json
{
  "title": "Binary Search",
  "description": "One sentence about what it does.",
  "tags": ["javascript", "algorithms"],
  "status": "wip",
  "accent": "#e2b45f"
}
```

4. Push. The **Build gallery index** workflow runs `scripts/build-gallery.mjs`, regenerates
   `projects.json`, and commits it back if anything changed. The gallery picks it up on the next load.

To preview locally before pushing:

```bash
node scripts/build-gallery.mjs
python -m http.server 8000
```

### project.json fields

| field | required | notes |
| --- | --- | --- |
| `title` | no | defaults to the folder name |
| `description` | no | shown on the card |
| `tags` | no | become the filter buttons on the gallery |
| `status` | no | `done`, `wip`, or `idea` (default `wip`) |
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
