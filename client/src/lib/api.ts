// Thin fetch wrappers around the server API. All calls go through /api, which Vite
// proxies to the Express server in dev and the same origin in production.

import type { AnalysisResult, Paper, PaperMetadata } from "../types";

async function jsonPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export interface Health {
  ok: boolean;
  mockMode: boolean;
  model: string;
}

export function getHealth(): Promise<Health> {
  return fetch("/api/health").then((r) => r.json());
}

export function metadataByDoi(doi: string): Promise<{ paper: PaperMetadata }> {
  return jsonPost("/api/metadata/doi", { doi });
}

export function metadataByArxiv(id: string): Promise<{ paper: PaperMetadata }> {
  return jsonPost("/api/metadata/arxiv", { id });
}

export interface PdfMetaResult {
  paper: PaperMetadata;
  via: "crossref" | "heuristic";
  filename: string;
  chars: number;
}

export async function metadataFromPdf(file: File): Promise<PdfMetaResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/metadata/pdf", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((data as { error?: string }).error || "Upload failed");
  return data as PdfMetaResult;
}

// Compact per-paper shape sent to the analysis endpoint as grounding context.
export interface AnalyzePaper {
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  abstract: string;
  doi: string;
  pdfText?: string;
}

export interface AnalyzeResult {
  mockMode: boolean;
  analysis: AnalysisResult;
}

export function analyzeCollection(params: {
  collectionName: string;
  papers: AnalyzePaper[];
}): Promise<AnalyzeResult> {
  return jsonPost<AnalyzeResult>("/api/analyze", params);
}

// Convert a saved Paper into the compact analysis shape.
export function toAnalyzePaper(p: Paper): AnalyzePaper {
  return {
    title: p.title,
    authors: p.authors,
    year: p.year,
    venue: p.venue,
    abstract: p.abstract,
    doi: p.doi,
    pdfText: p.pdfText,
  };
}
