// Shared client types. The server returns a subset of Paper (the metadata fields);
// the client adds id, tags, collectionIds, addedAt when saving.

export type PaperSource = "doi" | "arxiv" | "pdf" | "manual";

// Metadata as returned by the server's /api/metadata/* endpoints.
export interface PaperMetadata {
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  abstract: string;
  doi: string;
  url: string;
  source: PaperSource;
  arxivId?: string;
  pdfText?: string;
}

// A saved paper in the library.
export interface Paper extends PaperMetadata {
  id: string;
  tags: string[];
  collectionIds: string[];
  addedAt: string;
  notes?: string;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
}

// Structured analysis result (mirrors the server's OUTPUT_SCHEMA).
export interface AnalysisThread {
  title: string;
  description: string;
  papers: string[];
}

export interface AnalysisMethods {
  perPaper: { paper: string; methods: string[] }[];
  shared: string[];
  differing: string[];
}

export interface AnalysisResult {
  overview: string;
  threads: AnalysisThread[];
  methods: AnalysisMethods;
  openQuestions: string[];
  suggestedQuestions: string[];
}

// A stored analysis for a collection.
export interface Analysis {
  id: string;
  collectionId: string;
  collectionName: string;
  createdAt: string;
  mockMode: boolean;
  result: AnalysisResult;
}

export type CitationStyle = "apa" | "mla" | "chicago";
