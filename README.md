# paperclip

paperclip is a reference manager for researchers. You save papers with citation metadata, group them into collections, and export citations. You can also run an AI analysis across a whole collection.

> Status: this project is now part of rxiver. rxiver is the main research product. It owns discovery, folders, excerpt capture, APA and BibTeX export, and collection synthesis. This repository keeps paperclip as a legacy implementation and a migration reference.

## Features

- Add papers by identifier. A DOI resolves through CrossRef. An arXiv id or URL resolves through the arXiv API. The app fills in title, authors, year, venue, abstract, DOI and URL.
- Add papers by PDF upload. The server extracts the text and looks for a DOI. If it finds one, it resolves the DOI through CrossRef. If not, a first-page heuristic fills in the title and authors. The app keeps the extracted text for the AI analysis.
- Add papers by hand with a simple form.
- Library view with search, tag and year filters, and sorting. A side drawer shows the full record for one paper.
- Collections and free-form tags. One paper can be in more than one collection.
- Citations in BibTeX, APA, MLA and Chicago for one paper or a whole collection. You can copy them or download a `.bib` file. BibTeX cite keys are de-duplicated.
- Light and dark mode.

### AI analysis

`POST /api/analyze` returns a fixed JSON shape for a collection:

- `overview`: a short literature review.
- `threads`: common themes, each with a title, a description and the papers it uses.
- `methods`: `perPaper`, `shared` and `differing` approaches.
- `openQuestions`: gaps across the collection.
- `suggestedQuestions`: method questions to ask next.

The analysis uses each paper's metadata and abstract, plus extracted PDF text when available. With no API key, the server runs in mock mode. Mock mode builds the same shape from the real metadata (recurring terms, year span, per-paper signals). With a key, the server calls the `claude-sonnet-5` model and constrains the output with a JSON schema. The key stays on the server and never goes to the browser.

### Metadata sources

paperclip uses the CrossRef REST API (`https://api.crossref.org`) for DOIs and the arXiv API (`http://export.arxiv.org/api/query`) for arXiv ids. Neither needs a key. The server sends a descriptive User-Agent and caches responses for a short time. It also spaces out upstream requests. Please respect the terms of use of these services. The metadata belongs to the publishers and providers.

## Run it

You need Node.

```bash
git clone https://github.com/saanviiyer/paperclip
cd paperclip
npm install        # also installs the client
npm run dev
```

`npm run dev` starts the Express API on port 3001 and the Vite client on port 5173. The client sends `/api` requests to the server. Open http://localhost:5173.

The app works with no configuration. Metadata lookups need network access but no key.

Run the citation tests:

```bash
npm test
```

Production build:

```bash
npm run build      # type-checks and builds the client
npm start          # serves client/dist and /api on $PORT
```

### Deploy

The repository includes a multi-stage `Dockerfile`, a `.dockerignore` and a `render.yaml`. On Render, set `ANTHROPIC_API_KEY` in the dashboard to turn on live analysis. Leave it unset to deploy in mock mode.

## Environment variables

Copy `.env.example` to `.env` to set them. All are optional.

| Name | Purpose | Required |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Live AI analysis. Without it, analysis runs in mock mode. | Optional |
| `SEMANTIC_SCHOLAR_API_KEY` | Higher rate limits for future enrichment lookups. The current code does not use it. | Optional |
| `PORT` | Server port. Default is 3001. | Optional |

## Data and persistence

The browser stores all data (papers, collections, tags, analyses) in `localStorage`. All reads and writes go through the `Repository` interface in `client/src/lib/repository.ts`. The UI does not touch storage directly.

To move to Supabase later, add a `SupabaseRepository` class that uses the same interface:

1. Create tables for `papers`, `collections`, `paper_collections` (a join table) and `analyses`. Store `tags` as a text array on `papers` or in a separate table.
2. Add an `owner` column to every table. Add Row Level Security policies that scope each row to `auth.uid()`.
3. Add Supabase auth (email or OAuth) and require a signed-in session.
4. Implement `SupabaseRepository` in `repository.ts`.
5. Change the exported instance from `new LocalStorageRepository()` to `new SupabaseRepository()`. The components do not change.

## Layout

```
server/            Express (ESM) API
  index.js         routes, static hosting, SPA catch-all
  crossref.js      DOI metadata from CrossRef
  arxiv.js         arXiv metadata
  parse.js         PDF text extraction (unpdf) and metadata heuristics
  ai.js            collection analysis (mock and claude-sonnet-5)
  http.js          shared cache, rate-limit and User-Agent helpers
client/            Vite, React, strict TypeScript, Tailwind
  src/lib/cite.ts        citation formatting (pure, tested)
  src/lib/repository.ts  localStorage data access
  src/lib/api.ts         fetch wrappers for /api
  src/components/        UI
Dockerfile, .dockerignore, render.yaml, .env.example
```
