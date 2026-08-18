# paperclip

> **Consolidated into rxiver.** rxiver is now the canonical research product and
> owns discovery, folders, excerpt capture, APA/BibTeX export, and grounded
> collection synthesis. This directory is preserved as a legacy implementation
> and migration reference so no working code or browser data is destroyed.

A calm, modern reference manager for researchers. Save papers with real citation
metadata, group them into collections, export citations in several styles, and run an
AI analysis across a whole collection to surface common threads, method comparisons,
and open questions. The clean, uncluttered interface is the point: it is meant to be a
nicer place to keep your papers than the usual reference managers.

paperclip was the original reference, citation, and cross-paper-analysis tool.

## What it does

- **Add papers three ways**
  - By identifier: a DOI (resolved via CrossRef) or an arXiv id or URL (resolved via
    the arXiv API). Title, authors, year, venue, abstract, DOI, and URL are pulled in
    automatically.
  - By PDF upload: the text is extracted, a DOI is detected when present (and resolved
    via CrossRef), otherwise a first-page title and author heuristic fills in the gaps.
    The extracted text is kept to ground the AI analysis.
  - By hand: a simple form for anything else.
- **Library view**: a clean grid of saved papers with search, tag and year filters, and
  sorting. Open any paper for its full record in a side drawer.
- **Collections and tags**: create, rename, and delete collections; a paper can belong
  to several at once. Free-form tags are filterable from the sidebar.
- **Citations**: generate BibTeX and formatted citations in APA, MLA, and Chicago for a
  single paper or a whole collection. Copy to the clipboard or download a `.bib` file.
- **AI analysis across a collection**: run an analysis that returns a short synthesized
  overview, common threads and themes, a methods comparison (methods per paper plus
  shared and differing approaches), open questions and gaps, and suggested method
  questions. It is grounded in each paper's metadata and abstract, plus extracted PDF
  text when available.
- **Light and dark mode**, calm typography, and generous spacing throughout.

## Run it

Requires Node. From the project root:

```bash
npm install
npm run dev
```

That starts the Express API on port 3001 and the Vite client on port 5173 (the client
proxies `/api` to the server). Open http://localhost:5173.

The whole app works with **no configuration**. With no API key set, the collection
analysis runs in a realistic **mock mode**, so you can use every feature immediately.
Metadata lookups (CrossRef and arXiv) need network access but no key.

### Live AI analysis

To use the real Anthropic API for collection analysis, copy `.env.example` to `.env`
and set your key:

```bash
cp .env.example .env
# then edit .env:
# ANTHROPIC_API_KEY=sk-ant-...
```

Restart `npm run dev`. The analysis endpoint uses the `claude-sonnet-5` model and
returns the same structured shape as mock mode. The key is read server-side only and is
never shipped to the browser.

## Metadata sources and attribution

paperclip fetches metadata from public scholarly APIs and is a polite client: it sends
a descriptive User-Agent, caches responses briefly, and spaces out upstream requests.

- **CrossRef** REST API (`https://api.crossref.org`) for DOIs. No key required.
- **arXiv** API (`http://export.arxiv.org/api/query`) for arXiv ids. No key required.
- Optional: a `SEMANTIC_SCHOLAR_API_KEY` can be set for higher rate limits on any future
  enrichment lookups. It is not required for anything today.

Please respect the terms of use of these services. Metadata belongs to the respective
publishers and providers.

## Citation export

Citation formatting lives in a single pure, testable module: `client/src/lib/cite.ts`.
It has no side effects and no dependencies, so it is easy to unit-test and reuse.

- BibTeX for a single paper and for a whole collection (with de-duplicated cite keys).
- Formatted citations in APA, MLA, and Chicago.
- Copy to clipboard and download a `.bib` file from the citations panel.

Run the citation tests:

```bash
npm test
```

## AI analysis, structured

The analysis endpoint (`POST /api/analyze`) returns a fixed, structured shape:

- `overview`: a short synthesized mini literature review.
- `threads`: common threads and themes, each with a title, a description, and the papers
  it draws on.
- `methods`: a methods comparison with `perPaper` (methods per paper), `shared`
  approaches, and `differing` approaches.
- `openQuestions`: open questions and gaps across the collection.
- `suggestedQuestions`: suggested method questions to ask next.

In mock mode this is generated from the real metadata in the collection (recurring
terms, year span, per-paper signals). With a key, the same shape is produced by the
model, constrained with a JSON schema so the response is always valid.

## Data and persistence

All data (papers, collections, tags, analyses) is stored in the browser via
`localStorage`, behind a single data-access abstraction: `client/src/lib/repository.ts`.
The UI never touches storage directly; it only talks to the `repo` object.

### Supabase upgrade path

Because every read and write goes through the `Repository` interface, moving to a hosted
backend later is a drop-in change and requires no UI edits:

1. Create a Supabase project with tables for `papers`, `collections`,
   `paper_collections` (a join table), and `analyses`. Store `tags` as a text array on
   `papers` or as its own table.
2. Add **Row Level Security** policies so each row is scoped to `auth.uid()`, and add an
   `owner` column to every table.
3. Add Supabase auth (email or OAuth) and gate the app behind a signed-in session.
4. Implement a `SupabaseRepository` class against the same `Repository` interface in
   `repository.ts`, using the Supabase client for each method.
5. Swap the exported instance from `new LocalStorageRepository()` to
   `new SupabaseRepository()`. Nothing in the components changes.

This mirrors how the sibling apps layer a Supabase backend in later.

## Production build and deploy

Build the client and run the single-process production server (Express serves the built
client and the `/api` routes on one port):

```bash
npm run build     # type-checks and builds the client (zero TS errors)
npm start         # NODE_ENV=production, serves client/dist + /api on $PORT
```

A multi-stage `Dockerfile`, a `.dockerignore`, and a `render.yaml` are included and
follow the same shape as the sibling apps. On Render, set `ANTHROPIC_API_KEY` in the
dashboard (it is marked `sync: false`) to enable live analysis; leave it unset to deploy
in mock mode.

## Project layout

```
paperclip/
  server/            Express (ESM) API: metadata, PDF parsing, AI analysis
    index.js         routes + static hosting + SPA catch-all
    crossref.js      DOI metadata via CrossRef
    arxiv.js         arXiv metadata
    parse.js         PDF text extraction (unpdf) + metadata heuristics
    ai.js            collection analysis (mock + claude-sonnet-5)
    http.js          shared cache / rate-limit / User-Agent helpers
  client/            Vite + React + TypeScript (strict) + Tailwind
    src/lib/cite.ts        pure citation formatting (tested)
    src/lib/repository.ts  localStorage data-access abstraction
    src/lib/api.ts         fetch wrappers for /api
    src/components/        UI
  Dockerfile, .dockerignore, render.yaml, .env.example
```
