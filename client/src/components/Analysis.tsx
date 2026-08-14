// Cross-paper AI analysis for a collection. Runs the /api/analyze endpoint, caches the
// structured result via the repository, and renders it in calm sections.
import { useEffect, useMemo, useState } from "react";
import type { Analysis as AnalysisT, Collection, Paper } from "../types";
import { analyzeCollection, toAnalyzePaper } from "../lib/api";
import { repo } from "../lib/repository";
import { IconSpark } from "./Icons";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function Analysis({
  collection,
  papers,
  mockMode,
}: {
  collection: Collection;
  papers: Paper[];
  mockMode: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<AnalysisT | undefined>(undefined);

  const history = useMemo(
    () => repo.listAnalyses(collection.id),
    [collection.id, current]
  );

  useEffect(() => {
    // Show the most recent cached analysis for this collection, if any.
    const latest = repo.listAnalyses(collection.id)[0];
    setCurrent(latest);
    setError("");
  }, [collection.id]);

  async function run() {
    if (papers.length === 0) {
      setError("Add papers to this collection first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { analysis, mockMode: mm } = await analyzeCollection({
        collectionName: collection.name,
        papers: papers.map(toAnalyzePaper),
      });
      const saved = repo.saveAnalysis({
        collectionId: collection.id,
        collectionName: collection.name,
        mockMode: mm,
        result: analysis,
      });
      setCurrent(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const r = current?.result;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-gradient-to-br from-indigo-50/60 to-white p-5 dark:border-neutral-800 dark:from-indigo-950/20 dark:to-neutral-900">
        <div>
          <h2 className="text-lg font-semibold">Analyze this collection</h2>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            Surface common threads, compare methods, and find open questions across all{" "}
            {papers.length} paper{papers.length === 1 ? "" : "s"}.
            {mockMode && " Running in demo mode (no API key set)."}
          </p>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          <IconSpark width={16} height={16} />
          {busy ? "Analyzing…" : current ? "Re-run analysis" : "Run analysis"}
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      {!current && !busy && (
        <div className="rounded-2xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-400">
            No analysis yet. Run one to see threads, method comparisons, and open
            questions.
          </p>
        </div>
      )}

      {r && (
        <div className="space-y-5">
          {current?.createdAt && (
            <p className="text-xs text-neutral-400">
              Generated {new Date(current.createdAt).toLocaleString()}
              {current.mockMode ? " · demo mode" : ""}
            </p>
          )}

          <Section title="Overview">
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {r.overview}
            </p>
          </Section>

          <Section title="Common threads">
            <div className="space-y-4">
              {r.threads.map((t, i) => (
                <div key={i}>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {t.title}
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {t.description}
                  </p>
                  {t.papers.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {t.papers.map((p, j) => (
                        <span
                          key={j}
                          className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Methods comparison">
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="mb-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Shared
                </h4>
                <ul className="space-y-1">
                  {r.methods.shared.map((s, i) => (
                    <li
                      key={i}
                      className="text-sm text-neutral-600 dark:text-neutral-400"
                    >
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Differing
                </h4>
                <ul className="space-y-1">
                  {r.methods.differing.map((s, i) => (
                    <li
                      key={i}
                      className="text-sm text-neutral-600 dark:text-neutral-400"
                    >
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                    <th className="py-2 pr-4 font-semibold">Paper</th>
                    <th className="py-2 font-semibold">Methods</th>
                  </tr>
                </thead>
                <tbody>
                  {r.methods.perPaper.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-neutral-100 align-top last:border-0 dark:border-neutral-800"
                    >
                      <td className="py-2.5 pr-4 font-medium text-neutral-700 dark:text-neutral-300">
                        {row.paper}
                      </td>
                      <td className="py-2.5 text-neutral-600 dark:text-neutral-400">
                        {row.methods.join("; ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid gap-5 md:grid-cols-2">
            <Section title="Open questions & gaps">
              <ul className="space-y-2">
                {r.openQuestions.map((q, i) => (
                  <li
                    key={i}
                    className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
                  >
                    • {q}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Suggested method questions">
              <ul className="space-y-2">
                {r.suggestedQuestions.map((q, i) => (
                  <li
                    key={i}
                    className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
                  >
                    • {q}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {history.length > 1 && (
            <p className="text-xs text-neutral-400">
              {history.length} analyses saved for this collection.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
