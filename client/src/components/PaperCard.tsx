// A single paper in the library grid: title, authors, year/venue, tags, abstract preview.
import type { Paper } from "../types";

function authorLine(authors: string[]): string {
  if (authors.length === 0) return "Unknown author";
  if (authors.length <= 3) return authors.join(", ");
  return `${authors.slice(0, 3).join(", ")} + ${authors.length - 3} more`;
}

const SOURCE_LABEL: Record<Paper["source"], string> = {
  doi: "DOI",
  arxiv: "arXiv",
  pdf: "PDF",
  manual: "Manual",
};

export default function PaperCard({
  paper,
  onOpen,
}: {
  paper: Paper;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5 text-left transition hover:border-neutral-300 hover:shadow-[0_2px_20px_-8px_rgba(0,0,0,0.15)] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {SOURCE_LABEL[paper.source]}
        </span>
        {paper.year && (
          <span className="text-[11px] font-medium text-neutral-400">{paper.year}</span>
        )}
      </div>

      <h3 className="mb-1.5 text-[15px] font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
        {paper.title || "Untitled"}
      </h3>
      <p className="mb-1 text-[13px] text-neutral-500 dark:text-neutral-400">
        {authorLine(paper.authors)}
      </p>
      {paper.venue && (
        <p className="mb-3 text-[13px] italic text-neutral-400 dark:text-neutral-500">
          {paper.venue}
        </p>
      )}

      {paper.abstract && (
        <p className="mb-3 line-clamp-3 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          {paper.abstract}
        </p>
      )}

      {paper.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {paper.tags.slice(0, 5).map((t) => (
            <span
              key={t}
              className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
