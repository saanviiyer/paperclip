import { useEffect, useMemo, useState } from "react";
import type { Collection, Paper } from "./types";
import { repo } from "./lib/repository";
import { getHealth } from "./lib/api";
import PaperCard from "./components/PaperCard";
import PaperDetail from "./components/PaperDetail";
import AddPaper from "./components/AddPaper";
import Analysis from "./components/Analysis";
import CitationPanel from "./components/CitationPanel";
import {
  IconPlus,
  IconSearch,
  IconCollection,
  IconLibrary,
  IconSpark,
  IconSun,
  IconMoon,
  IconTrash,
  IconEdit,
} from "./components/Icons";

type Sort = "recent" | "year" | "title";
type CollectionTab = "papers" | "analysis" | "citations";

const THEME_KEY = "paperclip.theme";

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const prefers =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefers;
    setDark(isDark);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  const toggle = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      return next;
    });
  };
  return { dark, toggle };
}

export default function App() {
  const { dark, toggle } = useTheme();
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    null
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [openPaperId, setOpenPaperId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<CollectionTab>("papers");
  const [mockMode, setMockMode] = useState(false);

  // Data, re-read whenever `version` bumps.
  const papers = useMemo<Paper[]>(() => repo.listPapers(), [version]);
  const collections = useMemo<Collection[]>(() => repo.listCollections(), [version]);
  const allTags = useMemo(() => repo.allTags(), [version]);

  useEffect(() => {
    getHealth()
      .then((h) => setMockMode(h.mockMode))
      .catch(() => setMockMode(true));
  }, []);

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);

  // Papers scoped to the current view (collection or all).
  const scoped = useMemo(() => {
    let list = papers;
    if (selectedCollectionId)
      list = list.filter((p) => p.collectionIds.includes(selectedCollectionId));
    if (selectedTag) list = list.filter((p) => p.tags.includes(selectedTag));
    return list;
  }, [papers, selectedCollectionId, selectedTag]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const p of scoped) if (typeof p.year === "number") set.add(p.year);
    return [...set].sort((a, b) => b - a);
  }, [scoped]);

  const filtered = useMemo(() => {
    let list = scoped;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [p.title, p.venue, p.abstract, ...p.authors, ...p.tags]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (yearFilter) list = list.filter((p) => String(p.year) === yearFilter);
    const sorted = [...list];
    if (sort === "recent")
      sorted.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
    else if (sort === "year")
      sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
    else sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }, [scoped, search, yearFilter, sort]);

  const openPaper = openPaperId ? repo.getPaper(openPaperId) : undefined;

  function newCollection() {
    const name = prompt("Name your collection");
    if (name && name.trim()) {
      const c = repo.createCollection(name.trim());
      bump();
      setSelectedCollectionId(c.id);
      setTab("papers");
    }
  }
  function renameCollection(c: Collection) {
    const name = prompt("Rename collection", c.name);
    if (name && name.trim()) {
      repo.renameCollection(c.id, name.trim());
      bump();
    }
  }
  function deleteCollection(c: Collection) {
    if (confirm(`Delete the collection "${c.name}"? Papers are kept in your library.`)) {
      repo.deleteCollection(c.id);
      if (selectedCollectionId === c.id) setSelectedCollectionId(null);
      bump();
    }
  }

  const navItem =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition text-left";
  const navActive =
    "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900";
  const navIdle =
    "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800";

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white/70 px-4 py-5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/50">
        <div className="mb-6 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 7 8.5 15.5a3 3 0 0 1-4-4L13 3a5 5 0 0 1 7 7l-8 8a7 7 0 0 1-10-10l7-7" />
              </svg>
            </div>
            <span className="text-[17px] font-semibold tracking-tight">paperclip</span>
          </div>
          <button
            onClick={toggle}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
            title="Toggle theme"
          >
            {dark ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
          </button>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="mb-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <IconPlus width={16} height={16} /> Add paper
        </button>

        <nav className="space-y-0.5">
          <button
            className={`${navItem} ${
              selectedCollectionId === null ? navActive : navIdle
            }`}
            onClick={() => {
              setSelectedCollectionId(null);
              setSelectedTag(null);
              setTab("papers");
            }}
          >
            <IconLibrary width={17} height={17} />
            All papers
            <span className="ml-auto text-xs opacity-60">{papers.length}</span>
          </button>
        </nav>

        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between px-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Collections
            </span>
            <button
              onClick={newCollection}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              title="New collection"
            >
              <IconPlus width={15} height={15} />
            </button>
          </div>
          <nav className="space-y-0.5">
            {collections.length === 0 && (
              <p className="px-3 py-1 text-xs text-neutral-400">
                No collections yet.
              </p>
            )}
            {collections.map((c) => {
              const count = papers.filter((p) =>
                p.collectionIds.includes(c.id)
              ).length;
              const active = selectedCollectionId === c.id;
              return (
                <div key={c.id} className="group relative">
                  <button
                    className={`${navItem} ${active ? navActive : navIdle}`}
                    onClick={() => {
                      setSelectedCollectionId(c.id);
                      setSelectedTag(null);
                      setTab("papers");
                    }}
                  >
                    <IconCollection width={17} height={17} />
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-xs opacity-60">{count}</span>
                  </button>
                  <div
                    className={`absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 group-hover:flex ${
                      active ? "text-white/70 dark:text-neutral-900/60" : "text-neutral-400"
                    }`}
                  >
                    <button
                      onClick={() => renameCollection(c)}
                      className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
                      title="Rename"
                    >
                      <IconEdit width={13} height={13} />
                    </button>
                    <button
                      onClick={() => deleteCollection(c)}
                      className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
                      title="Delete"
                    >
                      <IconTrash width={13} height={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {allTags.length > 0 && (
          <div className="mt-6">
            <span className="mb-1.5 block px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Tags
            </span>
            <div className="flex flex-wrap gap-1.5 px-2">
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                  className={`rounded-md px-2 py-0.5 text-[12px] font-medium transition ${
                    selectedTag === t
                      ? "bg-indigo-600 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto px-3 pt-6">
          <p className="text-[11px] leading-relaxed text-neutral-400">
            {mockMode
              ? "AI analysis runs in demo mode. Set ANTHROPIC_API_KEY for live analysis."
              : "AI analysis is live."}
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-8 py-4 dark:border-neutral-800">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">
              {selectedCollection
                ? selectedCollection.name
                : selectedTag
                ? `Tag: ${selectedTag}`
                : "All papers"}
            </h1>
            <p className="text-xs text-neutral-400">
              {filtered.length} paper{filtered.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="relative">
            <IconSearch
              width={16}
              height={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library"
              className="w-56 rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-neutral-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:ring-indigo-900/40"
            />
          </div>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm text-neutral-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm text-neutral-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <option value="recent">Recently added</option>
            <option value="year">Year</option>
            <option value="title">Title</option>
          </select>
        </header>

        {/* Collection tabs */}
        {selectedCollection && (
          <div className="flex gap-1 border-b border-neutral-200 px-8 dark:border-neutral-800">
            {(
              [
                ["papers", "Papers"],
                ["analysis", "AI analysis"],
                ["citations", "Citations"],
              ] as [CollectionTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  tab === id
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                {id === "analysis" && (
                  <IconSpark
                    width={14}
                    height={14}
                    className="mr-1 inline align-[-2px]"
                  />
                )}
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {selectedCollection && tab === "analysis" ? (
            <Analysis
              collection={selectedCollection}
              papers={scoped}
              mockMode={mockMode}
            />
          ) : selectedCollection && tab === "citations" ? (
            <div className="max-w-3xl">
              <CitationPanel papers={scoped} name={selectedCollection.name} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                <IconLibrary width={22} height={22} />
              </div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                {papers.length === 0
                  ? "Your library is empty."
                  : "No papers match this view."}
              </p>
              <p className="mt-1 text-sm text-neutral-400">
                {papers.length === 0
                  ? "Add a paper by DOI, arXiv id, PDF, or by hand."
                  : "Try clearing the search or filters."}
              </p>
              {papers.length === 0 && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <IconPlus width={16} height={16} /> Add your first paper
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <PaperCard key={p.id} paper={p} onOpen={() => setOpenPaperId(p.id)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showAdd && (
        <AddPaper
          onClose={() => setShowAdd(false)}
          onAdded={bump}
          collections={collections}
          defaultCollectionId={selectedCollectionId || undefined}
        />
      )}
      {openPaper && (
        <PaperDetail
          paper={openPaper}
          collections={collections}
          onClose={() => setOpenPaperId(null)}
          onChanged={bump}
        />
      )}
    </div>
  );
}
