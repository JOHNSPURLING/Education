# Staffroom Reference

A searchable knowledge base on secondary education in England for school leaders
and teachers. It summarises, with links to the originals:

- the evidence (EEF Toolkit and guidance reports, cognitive science, research reviews)
- statutory and non-statutory guidance on GOV.UK (behaviour, attendance, safeguarding, SEND, curriculum)
- Ofsted's inspection framework, accountability measures and compliance requirements
- the thinkers who shape practice (Paul Dix, Bill Rogers, Tom Bennett, Tom Sherrington, Mary Myatt and others)
- the organisations and publications worth following (EEF, Ofsted, Schools Week, Tes and others)

## How it is organised

| Path | What it is |
|---|---|
| `content/<area>/<slug>.md` | One entry per file: front matter (summary, status, sources, related entries) and a Markdown body |
| `content/categories.json` | The twelve areas, in display order |
| `CONTENT_GUIDE.md` | The rules for writing entries, and the master index of slugs |
| `site/` | The page template, styles and script |
| `scripts/build.mjs` | Validates the entries and builds the site |
| `docs/index.html` | The built site: one self-contained file |

## Using it

Open `docs/index.html` in a browser. It needs no server. To host it, enable GitHub
Pages for this repository with the source set to the `docs/` folder.

## Editing it

```bash
npm install
npm run build     # validate content and rebuild docs/index.html
npm run check     # validate only
```

Add or change an entry under `content/`, following `CONTENT_GUIDE.md`, then rebuild
and commit both the entry and `docs/index.html`.

## What to keep in mind

Entries are summaries, written to help you find and use the original source. Policy
and statutory guidance change often: each entry carries the date it was last checked.
Check the linked source before relying on an entry for a decision. This is general
information, not legal advice.
