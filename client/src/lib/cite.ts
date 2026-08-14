// Pure, dependency-free citation formatting. Everything here is a pure function of
// its inputs so it can be unit-tested in isolation (see cite.test.ts). The UI and the
// rest of the app import these; no side effects, no DOM, no fetch.

import type { CitationStyle } from "../types";

// The minimal shape needed to format a citation. Paper satisfies this.
export interface Citeable {
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  doi: string;
  url: string;
  arxivId?: string;
}

export interface ParsedName {
  family: string;
  given: string;
}

// Split a full name into family + given. Handles "Given Family" and "Family, Given".
export function parseName(full: string): ParsedName {
  const s = (full || "").trim();
  if (!s) return { family: "", given: "" };
  if (s.includes(",")) {
    const [family, given = ""] = s.split(",");
    return { family: family.trim(), given: given.trim() };
  }
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { family: parts[0], given: "" };
  const family = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(" ");
  return { family, given };
}

// "Jean Paul" -> "J. P."  |  "Yann" -> "Y."
function initials(given: string): string {
  return given
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((w) => `${w[0].toUpperCase()}.`)
    .join(" ");
}

// ---- Author-list formatters, one per style ---------------------------------

// APA 7: "LeCun, Y., Bengio, Y., & Hinton, G."
export function apaAuthors(authors: string[]): string {
  const names = authors.map((a) => {
    const { family, given } = parseName(a);
    const ini = initials(given);
    return ini ? `${family}, ${ini}` : family;
  });
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  const head = names.slice(0, -1).join(", ");
  return `${head}, & ${names[names.length - 1]}`;
}

// MLA 9: one -> inverted; two -> "A, and B"; three+ -> "A, et al."
export function mlaAuthors(authors: string[]): string {
  if (authors.length === 0) return "";
  const first = parseName(authors[0]);
  const firstInv = first.given ? `${first.family}, ${first.given}` : first.family;
  if (authors.length === 1) return firstInv;
  if (authors.length === 2) {
    const second = parseName(authors[1]);
    const secondNorm = second.given
      ? `${second.given} ${second.family}`
      : second.family;
    return `${firstInv}, and ${secondNorm}`;
  }
  return `${firstInv}, et al.`;
}

// Chicago (notes-bibliography): first inverted, rest normal, "and" before last.
export function chicagoAuthors(authors: string[]): string {
  if (authors.length === 0) return "";
  const first = parseName(authors[0]);
  const firstInv = first.given ? `${first.family}, ${first.given}` : first.family;
  if (authors.length === 1) return firstInv;
  const rest = authors.slice(1).map((a) => {
    const { family, given } = parseName(a);
    return given ? `${given} ${family}` : family;
  });
  if (rest.length === 1) return `${firstInv}, and ${rest[0]}`;
  const head = rest.slice(0, -1).join(", ");
  return `${firstInv}, ${head}, and ${rest[rest.length - 1]}`;
}

// ---- Small helpers ---------------------------------------------------------

function stripTrailingPunct(s: string): string {
  return s.replace(/[.,;\s]+$/, "");
}

function link(p: Citeable): string {
  if (p.doi) return `https://doi.org/${p.doi.replace(/^https?:\/\/doi\.org\//i, "")}`;
  return p.url || "";
}

const KEY_STOP = new Set(["a", "an", "the", "on", "of", "in", "for", "and", "to"]);

function firstTitleWord(title: string): string {
  const words = (title.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
    (w) => !KEY_STOP.has(w)
  );
  return words[0] || "untitled";
}

// A stable, human-readable BibTeX cite key: familyYEARword (e.g. lecun2015deep).
export function bibtexKey(p: Citeable): string {
  const family = p.authors.length
    ? parseName(p.authors[0]).family.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "anon";
  const year = p.year ? String(p.year) : "";
  return `${family || "anon"}${year}${firstTitleWord(p.title)}`;
}

// Escape the characters BibTeX treats specially inside a braced value.
function bibEscape(s: string): string {
  return s.replace(/([&%$#_])/g, "\\$1");
}

// ---- BibTeX ----------------------------------------------------------------

export function formatBibTeX(p: Citeable, key?: string): string {
  const citeKey = key || bibtexKey(p);
  const entryType = p.venue ? "article" : "misc";

  const fields: [string, string][] = [];
  if (p.title) fields.push(["title", bibEscape(p.title)]);
  if (p.authors.length) fields.push(["author", p.authors.map(bibEscape).join(" and ")]);
  if (p.year) fields.push(["year", String(p.year)]);
  if (p.venue) fields.push(["journal", bibEscape(p.venue)]);
  else if (p.arxivId) fields.push(["howpublished", `arXiv:${p.arxivId}`]);
  if (p.doi) fields.push(["doi", p.doi]);
  const url = p.url || (p.doi ? link(p) : "");
  if (url) fields.push(["url", url]);

  const body = fields.map(([k, v]) => `  ${k} = {${v}}`).join(",\n");
  return `@${entryType}{${citeKey},\n${body}\n}`;
}

// De-duplicate colliding keys across a collection by suffixing a, b, c...
export function formatCollectionBibTeX(papers: Citeable[]): string {
  const seen = new Map<string, number>();
  return papers
    .map((p) => {
      const base = bibtexKey(p);
      const n = seen.get(base) || 0;
      seen.set(base, n + 1);
      const key = n === 0 ? base : `${base}${String.fromCharCode(97 + n)}`;
      return formatBibTeX(p, key);
    })
    .join("\n\n");
}

// ---- Formatted (human-readable) citations ----------------------------------

function apa(p: Citeable): string {
  const authors = apaAuthors(p.authors);
  const year = p.year ? `(${p.year}).` : "(n.d.).";
  const title = p.title ? `${stripTrailingPunct(p.title)}.` : "";
  const venue = p.venue ? `${stripTrailingPunct(p.venue)}.` : "";
  const l = link(p);
  return [authors ? `${authors}` : "", year, title, venue, l]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function mla(p: Citeable): string {
  const authors = mlaAuthors(p.authors);
  // "et al." already ends with a period; don't double it.
  const authorPart = authors ? (authors.endsWith(".") ? authors : `${authors}.`) : "";
  const title = p.title ? `"${stripTrailingPunct(p.title)}."` : "";
  const venueYear = [
    p.venue ? stripTrailingPunct(p.venue) : "",
    p.year ? String(p.year) : "",
  ]
    .filter(Boolean)
    .join(", ");
  const tail = venueYear ? `${venueYear}.` : "";
  const l = link(p);
  return [authorPart, title, tail, l]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function chicago(p: Citeable): string {
  const authors = chicagoAuthors(p.authors);
  const title = p.title ? `"${stripTrailingPunct(p.title)}."` : "";
  const venue = p.venue ? stripTrailingPunct(p.venue) : "";
  const yearPart = p.year ? `(${p.year}).` : "";
  const venueYear = venue ? `${venue} ${yearPart}`.trim() : yearPart;
  const l = link(p);
  return [authors ? `${authors}.` : "", title, venueYear, l]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatCitation(p: Citeable, style: CitationStyle): string {
  switch (style) {
    case "mla":
      return mla(p);
    case "chicago":
      return chicago(p);
    case "apa":
    default:
      return apa(p);
  }
}

// A filesystem-safe basename for a .bib export.
export function citationFilename(name: string): string {
  const base = (name || "citations").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${base.replace(/^-+|-+$/g, "") || "citations"}.bib`;
}
