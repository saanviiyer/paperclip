// Citation export panel, reused for a single paper and for a whole collection.
// Shows formatted citations (APA / MLA / Chicago) and BibTeX, with copy-to-clipboard
// and a .bib download. Formatting comes entirely from the pure `cite` module.
import { useMemo, useState } from "react";
import type { CitationStyle, Paper } from "../types";
import {
  formatCitation,
  formatCollectionBibTeX,
  citationFilename,
} from "../lib/cite";
import { IconCopy, IconDownload } from "./Icons";

const STYLES: { id: CitationStyle; label: string }[] = [
  { id: "apa", label: "APA" },
  { id: "mla", label: "MLA" },
  { id: "chicago", label: "Chicago" },
];

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      <IconCopy width={14} height={14} />
      {copied ? "Copied" : label}
    </button>
  );
}

export default function CitationPanel({
  papers,
  name,
}: {
  papers: Paper[];
  name: string;
}) {
  const [style, setStyle] = useState<CitationStyle>("apa");

  const formatted = useMemo(
    () => papers.map((p) => formatCitation(p, style)),
    [papers, style]
  );
  const bibtex = useMemo(() => formatCollectionBibTeX(papers), [papers]);

  function downloadBib() {
    const blob = new Blob([bibtex], { type: "application/x-bibtex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = citationFilename(name);
    a.click();
    URL.revokeObjectURL(url);
  }

  if (papers.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        No papers to cite yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-800">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  style === s.id
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <CopyButton
            text={formatted.join("\n\n")}
            label={papers.length > 1 ? "Copy all" : "Copy"}
          />
        </div>
        <div className="space-y-2.5 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          {formatted.map((c, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300"
              style={{ textIndent: "-1.4rem", paddingLeft: "1.4rem" }}
            >
              {c}
            </p>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            BibTeX
          </span>
          <div className="flex items-center gap-1">
            <CopyButton text={bibtex} />
            <button
              onClick={downloadBib}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <IconDownload width={14} height={14} />
              .bib
            </button>
          </div>
        </div>
        <pre className="max-h-72 overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
          {bibtex}
        </pre>
      </div>
    </div>
  );
}
