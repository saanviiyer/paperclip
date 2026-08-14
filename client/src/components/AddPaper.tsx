// Modal for adding a paper three ways: by identifier (DOI or arXiv, auto-detected),
// by PDF upload, or by manual entry. On success it saves to the repository and closes.
import { useState } from "react";
import type { Collection, PaperMetadata } from "../types";
import {
  metadataByDoi,
  metadataByArxiv,
  metadataFromPdf,
} from "../lib/api";
import { repo } from "../lib/repository";
import { IconClose, IconLink, IconDownload, IconEdit } from "./Icons";

type Mode = "identifier" | "pdf" | "manual";

function looksLikeArxiv(s: string) {
  return /arxiv\.org|\barxiv:|^\s*\d{4}\.\d{4,5}(v\d+)?\s*$|^[a-z-]+\/\d{7}/i.test(s);
}
function looksLikeDoi(s: string) {
  return /10\.\d{4,9}\//.test(s);
}

const tabBase =
  "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition inline-flex items-center justify-center gap-1.5";

export default function AddPaper({
  onClose,
  onAdded,
  collections,
  defaultCollectionId,
}: {
  onClose: () => void;
  onAdded: () => void;
  collections: Collection[];
  defaultCollectionId?: string;
}) {
  const [mode, setMode] = useState<Mode>("identifier");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [collectionId, setCollectionId] = useState(defaultCollectionId || "");

  // identifier
  const [identifier, setIdentifier] = useState("");
  // manual
  const [m, setM] = useState({
    title: "",
    authors: "",
    year: "",
    venue: "",
    doi: "",
    url: "",
    abstract: "",
  });

  function save(meta: PaperMetadata) {
    repo.addPaper(meta, {
      collectionIds: collectionId ? [collectionId] : [],
    });
    onAdded();
    onClose();
  }

  async function submitIdentifier() {
    const val = identifier.trim();
    if (!val) return setError("Enter a DOI or an arXiv id / URL.");
    setBusy(true);
    setError("");
    try {
      const { paper } = looksLikeArxiv(val)
        ? await metadataByArxiv(val)
        : looksLikeDoi(val)
        ? await metadataByDoi(val)
        : // Default: try DOI, then arXiv.
          await metadataByDoi(val).catch(() => metadataByArxiv(val));
      save(paper);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitPdf(file: File) {
    setBusy(true);
    setError("");
    try {
      const { paper } = await metadataFromPdf(file);
      save(paper);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submitManual() {
    if (!m.title.trim()) return setError("A title is required.");
    const meta: PaperMetadata = {
      title: m.title.trim(),
      authors: m.authors
        .split(/[,;\n]/)
        .map((a) => a.trim())
        .filter(Boolean),
      year: m.year ? Number(m.year) || null : null,
      venue: m.venue.trim(),
      abstract: m.abstract.trim(),
      doi: m.doi.trim(),
      url: m.url.trim(),
      source: "manual",
    };
    save(meta);
  }

  const field =
    "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-indigo-900/40";

  return (
    <div
      className="pc-fade fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-neutral-900/40 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="pc-rise mt-6 w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add a paper</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
          >
            <IconClose />
          </button>
        </div>

        <div className="mb-5 flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            className={`${tabBase} ${
              mode === "identifier"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
            onClick={() => setMode("identifier")}
          >
            <IconLink width={15} height={15} /> DOI / arXiv
          </button>
          <button
            className={`${tabBase} ${
              mode === "pdf"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
            onClick={() => setMode("pdf")}
          >
            <IconDownload width={15} height={15} /> PDF
          </button>
          <button
            className={`${tabBase} ${
              mode === "manual"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
            onClick={() => setMode("manual")}
          >
            <IconEdit width={15} height={15} /> Manual
          </button>
        </div>

        {mode === "identifier" && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Paste a DOI (like 10.1038/nature14539) or an arXiv id or URL. paperclip
              fetches the real citation metadata.
            </p>
            <input
              autoFocus
              className={field}
              placeholder="10.1038/nature14539  or  arxiv.org/abs/1706.03762"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitIdentifier()}
            />
          </div>
        )}

        {mode === "pdf" && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Upload a text-based PDF. paperclip extracts the text, finds a DOI when it
              can, and keeps the text to ground the AI analysis.
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/20">
              <IconDownload className="text-neutral-400" />
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Choose a PDF
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) submitPdf(file);
                }}
              />
            </label>
          </div>
        )}

        {mode === "manual" && (
          <div className="grid grid-cols-2 gap-3">
            <input
              className={`${field} col-span-2`}
              placeholder="Title *"
              value={m.title}
              onChange={(e) => setM({ ...m, title: e.target.value })}
            />
            <input
              className={`${field} col-span-2`}
              placeholder="Authors (comma-separated)"
              value={m.authors}
              onChange={(e) => setM({ ...m, authors: e.target.value })}
            />
            <input
              className={field}
              placeholder="Year"
              value={m.year}
              onChange={(e) => setM({ ...m, year: e.target.value })}
            />
            <input
              className={field}
              placeholder="Venue / journal"
              value={m.venue}
              onChange={(e) => setM({ ...m, venue: e.target.value })}
            />
            <input
              className={field}
              placeholder="DOI"
              value={m.doi}
              onChange={(e) => setM({ ...m, doi: e.target.value })}
            />
            <input
              className={field}
              placeholder="URL"
              value={m.url}
              onChange={(e) => setM({ ...m, url: e.target.value })}
            />
            <textarea
              className={`${field} col-span-2 min-h-[80px] resize-y`}
              placeholder="Abstract (optional)"
              value={m.abstract}
              onChange={(e) => setM({ ...m, abstract: e.target.value })}
            />
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <select
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm text-neutral-700 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                Add to: {c.name}
              </option>
            ))}
          </select>

          {mode !== "pdf" && (
            <button
              disabled={busy}
              onClick={mode === "identifier" ? submitIdentifier : submitManual}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? "Fetching…" : "Add paper"}
            </button>
          )}
          {mode === "pdf" && busy && (
            <span className="text-sm text-neutral-500">Reading PDF…</span>
          )}
        </div>
      </div>
    </div>
  );
}
