// Data-access abstraction. The entire UI talks to `repo` (a Repository) and never
// touches localStorage directly. To move persistence to Supabase later, implement this
// same interface against Postgres/RLS and swap the export — no UI changes required.
// See README "Supabase upgrade path".

import type {
  Analysis,
  Collection,
  Paper,
  PaperMetadata,
} from "../types";

export interface Repository {
  // Papers
  listPapers(): Paper[];
  getPaper(id: string): Paper | undefined;
  addPaper(meta: PaperMetadata, opts?: { collectionIds?: string[]; tags?: string[] }): Paper;
  updatePaper(id: string, patch: Partial<Paper>): void;
  deletePaper(id: string): void;

  // Collections
  listCollections(): Collection[];
  getCollection(id: string): Collection | undefined;
  createCollection(name: string): Collection;
  renameCollection(id: string, name: string): void;
  deleteCollection(id: string): void;
  setPaperCollections(paperId: string, collectionIds: string[]): void;

  // Tags
  setPaperTags(paperId: string, tags: string[]): void;
  allTags(): string[];

  // Analyses (cached AI results per collection)
  listAnalyses(collectionId: string): Analysis[];
  saveAnalysis(a: Omit<Analysis, "id" | "createdAt">): Analysis;
  deleteAnalysis(id: string): void;
}

const PAPERS_KEY = "paperclip.papers.v1";
const COLLECTIONS_KEY = "paperclip.collections.v1";
const ANALYSES_KEY = "paperclip.analyses.v1";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private-mode failures
  }
}

// Two papers are "the same" if they share a DOI, an arXiv id, or a normalized title.
function sameKey(p: PaperMetadata): string {
  if (p.doi) return `doi:${p.doi.toLowerCase()}`;
  if (p.arxivId) return `arxiv:${p.arxivId.toLowerCase()}`;
  return `title:${(p.title || "").toLowerCase().replace(/\s+/g, " ").trim()}`;
}

class LocalStorageRepository implements Repository {
  private papers: Paper[] = read<Paper[]>(PAPERS_KEY, []);
  private collections: Collection[] = read<Collection[]>(COLLECTIONS_KEY, []);
  private analyses: Analysis[] = read<Analysis[]>(ANALYSES_KEY, []);

  private persistPapers() {
    write(PAPERS_KEY, this.papers);
  }
  private persistCollections() {
    write(COLLECTIONS_KEY, this.collections);
  }
  private persistAnalyses() {
    write(ANALYSES_KEY, this.analyses);
  }

  // ---- Papers ----
  listPapers() {
    return [...this.papers];
  }
  getPaper(id: string) {
    return this.papers.find((p) => p.id === id);
  }
  addPaper(meta: PaperMetadata, opts: { collectionIds?: string[]; tags?: string[] } = {}) {
    const key = sameKey(meta);
    const existing = this.papers.find((p) => sameKey(p) === key);
    if (existing) {
      // Merge new collection/tag assignments into the existing paper.
      const collectionIds = Array.from(
        new Set([...existing.collectionIds, ...(opts.collectionIds || [])])
      );
      const tags = Array.from(new Set([...existing.tags, ...(opts.tags || [])]));
      Object.assign(existing, {
        collectionIds,
        tags,
        // Keep any newly extracted PDF text if we didn't have it before.
        pdfText: existing.pdfText || meta.pdfText,
        abstract: existing.abstract || meta.abstract,
      });
      this.persistPapers();
      return existing;
    }
    const paper: Paper = {
      ...meta,
      id: uid(),
      tags: opts.tags || [],
      collectionIds: opts.collectionIds || [],
      addedAt: new Date().toISOString(),
    };
    this.papers = [paper, ...this.papers];
    this.persistPapers();
    return paper;
  }
  updatePaper(id: string, patch: Partial<Paper>) {
    const p = this.getPaper(id);
    if (!p) return;
    Object.assign(p, patch);
    this.persistPapers();
  }
  deletePaper(id: string) {
    this.papers = this.papers.filter((p) => p.id !== id);
    this.persistPapers();
  }

  // ---- Collections ----
  listCollections() {
    return [...this.collections];
  }
  getCollection(id: string) {
    return this.collections.find((c) => c.id === id);
  }
  createCollection(name: string) {
    const c: Collection = {
      id: uid(),
      name: name.trim() || "Untitled collection",
      createdAt: new Date().toISOString(),
    };
    this.collections = [...this.collections, c];
    this.persistCollections();
    return c;
  }
  renameCollection(id: string, name: string) {
    const c = this.getCollection(id);
    if (c) {
      c.name = name.trim() || c.name;
      this.persistCollections();
    }
  }
  deleteCollection(id: string) {
    this.collections = this.collections.filter((c) => c.id !== id);
    for (const p of this.papers) {
      if (p.collectionIds.includes(id)) {
        p.collectionIds = p.collectionIds.filter((cid) => cid !== id);
      }
    }
    this.analyses = this.analyses.filter((a) => a.collectionId !== id);
    this.persistCollections();
    this.persistPapers();
    this.persistAnalyses();
  }
  setPaperCollections(paperId: string, collectionIds: string[]) {
    const p = this.getPaper(paperId);
    if (!p) return;
    p.collectionIds = Array.from(new Set(collectionIds));
    this.persistPapers();
  }

  // ---- Tags ----
  setPaperTags(paperId: string, tags: string[]) {
    const p = this.getPaper(paperId);
    if (!p) return;
    p.tags = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
    this.persistPapers();
  }
  allTags() {
    const set = new Set<string>();
    for (const p of this.papers) for (const t of p.tags) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  // ---- Analyses ----
  listAnalyses(collectionId: string) {
    return this.analyses
      .filter((a) => a.collectionId === collectionId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  saveAnalysis(a: Omit<Analysis, "id" | "createdAt">) {
    const full: Analysis = { ...a, id: uid(), createdAt: new Date().toISOString() };
    this.analyses = [full, ...this.analyses];
    this.persistAnalyses();
    return full;
  }
  deleteAnalysis(id: string) {
    this.analyses = this.analyses.filter((a) => a.id !== id);
    this.persistAnalyses();
  }
}

// The single shared instance the UI imports.
export const repo: Repository = new LocalStorageRepository();
