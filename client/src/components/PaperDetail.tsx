// Slide-in drawer with a paper's full metadata, editable tags, collection membership,
// and a single-paper citation panel. Writes go through the repository.
import { useState } from "react";
import type { Collection, Paper } from "../types";
import { repo } from "../lib/repository";
import CitationPanel from "./CitationPanel";
import { IconClose, IconTrash, IconLink } from "./Icons";

export default function PaperDetail({
  paper,
  collections,
  onClose,
  onChanged,
}: {
  paper: Paper;
  collections: Collection[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tagInput, setTagInput] = useState("");
  const [showCite, setShowCite] = useState(false);

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    repo.setPaperTags(paper.id, [...paper.tags, t]);
    setTagInput("");
    onChanged();
  }
  function removeTag(t: string) {
    repo.setPaperTags(
      paper.id,
      paper.tags.filter((x) => x !== t)
    );
    onChanged();
  }
  function toggleCollection(id: string) {
    const next = paper.collectionIds.includes(id)
      ? paper.collectionIds.filter((c) => c !== id)
      : [...paper.collectionIds, id];
    repo.setPaperCollections(paper.id, next);
    onChanged();
  }
  function del() {
    if (confirm("Remove this paper from your library?")) {
      repo.deletePaper(paper.id);
      onChanged();
      onClose();
    }
  }

  return (
    <div
      className="pc-fade fixed inset-0 z-40 flex justify-end bg-neutral-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="pc-rise flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
        style={{ animationName: "pc-fade" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white/90 px-6 py-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Paper
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={del}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              title="Delete"
            >
              <IconTrash />
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
            >
              <IconClose />
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div>
            <h1 className="text-xl font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
              {paper.title || "Untitled"}
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              {paper.authors.join(", ") || "Unknown author"}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              {[paper.venue, paper.year].filter(Boolean).join(" · ")}
            </p>
            {(paper.url || paper.doi) && (
              <a
                href={paper.url || `https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                <IconLink width={15} height={15} />
                {paper.doi ? paper.doi : "Open source"}
              </a>
            )}
          </div>

          {paper.abstract && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Abstract
              </h4>
              <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                {paper.abstract}
              </p>
            </div>
          )}

          {/* Tags */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Tags
            </h4>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {paper.tags.map((t) => (
                <button
                  key={t}
                  onClick={() => removeTag(t)}
                  className="group inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[12px] font-medium text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300"
                >
                  {t}
                  <span className="text-indigo-400 group-hover:text-indigo-600">×</span>
                </button>
              ))}
              {paper.tags.length === 0 && (
                <span className="text-sm text-neutral-400">No tags yet</span>
              )}
            </div>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="Add a tag and press Enter"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:ring-indigo-900/40"
            />
          </div>

          {/* Collections */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Collections
            </h4>
            {collections.length === 0 ? (
              <p className="text-sm text-neutral-400">
                No collections yet. Create one from the sidebar.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {collections.map((c) => {
                  const on = paper.collectionIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCollection(c.id)}
                      className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${
                        on
                          ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Citations */}
          <div>
            <button
              onClick={() => setShowCite((v) => !v)}
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              {showCite ? "Hide citations" : "Show citations"}
            </button>
            {showCite && (
              <CitationPanel papers={[paper]} name={paper.title || "citation"} />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
