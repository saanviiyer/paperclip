// Cross-paper AI analysis for a collection. Uses the Anthropic SDK when
// ANTHROPIC_API_KEY is set; otherwise returns a realistic, structured MOCK result so
// the whole app is usable with zero setup.
//
// The analysis is grounded in each paper's metadata + abstract (+ extracted PDF text
// when present) and returns a fixed structured shape (see AnalysisResult in the
// client types): overview, threads, methods comparison, open questions, and suggested
// method questions.
import Anthropic from "@anthropic-ai/sdk";

const API_KEY = process.env.ANTHROPIC_API_KEY;
export const MOCK_MODE = !API_KEY;
export const MODEL = "claude-sonnet-5";

const client = MOCK_MODE ? null : new Anthropic({ apiKey: API_KEY });

const SYSTEM_PROMPT = `You are paperclip's research analyst. You are given a researcher's collection of
papers (titles, authors, years, venues, abstracts, and sometimes extracted PDF text). Produce a
grounded cross-paper analysis that helps them see the shape of the collection.

Rules:
- Ground every claim in the provided papers. Refer to papers by their exact titles.
- Do not invent findings, methods, authors, datasets, or citations that are not supported by the
  provided text. If the abstracts are thin, say so plainly rather than speculating.
- Be specific and useful. Prefer concrete threads and method contrasts over generic advice.`;

// JSON Schema the model is constrained to (structured outputs). Keep it flat and
// fully-required with additionalProperties:false, per the API's schema rules.
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overview: { type: "string" },
    threads: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          papers: { type: "array", items: { type: "string" } },
        },
        required: ["title", "description", "papers"],
      },
    },
    methods: {
      type: "object",
      additionalProperties: false,
      properties: {
        perPaper: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              paper: { type: "string" },
              methods: { type: "array", items: { type: "string" } },
            },
            required: ["paper", "methods"],
          },
        },
        shared: { type: "array", items: { type: "string" } },
        differing: { type: "array", items: { type: "string" } },
      },
      required: ["perPaper", "shared", "differing"],
    },
    openQuestions: { type: "array", items: { type: "string" } },
    suggestedQuestions: { type: "array", items: { type: "string" } },
  },
  required: [
    "overview",
    "threads",
    "methods",
    "openQuestions",
    "suggestedQuestions",
  ],
};

// Render the collection into a compact, grounded text block for the model.
function buildContext(collectionName, papers) {
  const lines = [];
  lines.push(`Collection: "${collectionName || "Untitled collection"}"`);
  lines.push(`Papers: ${papers.length}`);
  papers.forEach((p, i) => {
    lines.push(`\n[${i + 1}] ${p.title || "Untitled"}`);
    if (p.authors && p.authors.length)
      lines.push(`Authors: ${p.authors.slice(0, 12).join(", ")}`);
    lines.push(
      `Year: ${p.year || "n/a"}  Venue: ${p.venue || "n/a"}${
        p.doi ? `  DOI: ${p.doi}` : ""
      }`
    );
    if (p.abstract) lines.push(`Abstract: ${p.abstract.slice(0, 1400)}`);
    if (p.pdfText) lines.push(`Extracted text (excerpt): ${p.pdfText.slice(0, 1600)}`);
  });
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// MOCK MODE — a believable, grounded-looking analysis built from real metadata.
// ---------------------------------------------------------------------------
const STOP = new Set(
  "a an the of and or to in for with on at as is are be by we our this that from into using also can new using toward towards via using".split(
    " "
  )
);

function topTerms(papers, n = 6) {
  const freq = new Map();
  for (const p of papers) {
    const text = `${p.title} ${p.abstract || ""}`.toLowerCase();
    for (const w of text.match(/[a-z][a-z0-9+.#-]{3,}/g) || []) {
      if (!STOP.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([t]) => t);
}

function mockAnalysis(collectionName, papers) {
  const titles = papers.map((p) => p.title || "Untitled");
  const shared = topTerms(papers, 6);
  const years = papers.map((p) => p.year).filter((y) => typeof y === "number");
  const span =
    years.length > 1
      ? `${Math.min(...years)}–${Math.max(...years)}`
      : years.length === 1
      ? `${years[0]}`
      : "an unspecified period";

  const overview =
    `This collection gathers ${papers.length} paper${
      papers.length === 1 ? "" : "s"
    } spanning ${span}. ` +
    (shared.length
      ? `Recurring themes across the abstracts include ${shared
          .slice(0, 4)
          .join(", ")}. `
      : "") +
    `The works range from ${titles[0]}${
      titles.length > 1 ? ` to ${titles[titles.length - 1]}` : ""
    }, and together they sketch a shared problem space with several distinct methodological approaches. ` +
    `(This is a MOCK synthesis generated with no API key — set ANTHROPIC_API_KEY for a live analysis from ${MODEL}.)`;

  const threads = [];
  if (shared.length) {
    threads.push({
      title: `Shared focus on ${shared[0]}`,
      description: `Several papers foreground ${shared[0]}${
        shared[1] ? ` and ${shared[1]}` : ""
      } as a central concern, suggesting a common thread worth reading side by side.`,
      papers: titles.slice(0, Math.min(3, titles.length)),
    });
  }
  threads.push({
    title: "Range of evaluation settings",
    description:
      "The papers appear to differ in the datasets and settings they evaluate on. Lining up their evaluation protocols is a good way to see where results are and are not comparable.",
    papers: titles.slice(0, Math.min(4, titles.length)),
  });
  if (years.length > 1) {
    threads.push({
      title: "A visible progression over time",
      description: `With work spanning ${span}, later papers likely build on or react to earlier framing. Reading them chronologically can surface how the questions shifted.`,
      papers: titles,
    });
  }

  const perPaper = papers.map((p) => {
    const terms = topTerms([p], 3);
    return {
      paper: p.title || "Untitled",
      methods: terms.length
        ? terms.map((t) => `approach involving ${t}`)
        : ["method not stated in the provided abstract"],
    };
  });

  const openQuestions = [
    shared.length
      ? `How consistently is ${shared[0]} defined and measured across these papers?`
      : "How comparable are the evaluation setups across these papers?",
    "Which findings replicate across more than one paper, and which stand alone?",
    "What assumptions do these approaches share that a new contribution could relax?",
  ];

  const suggestedQuestions = [
    "Which paper's method is the strongest baseline to compare a new approach against?",
    "Where do two of these papers disagree, and what experiment would settle it?",
    shared.length
      ? `Is there a gap around ${
          shared[2] || shared[0]
        } that none of these papers fully address?`
      : "Is there a sub-problem none of these papers fully address?",
  ];

  return {
    overview,
    threads,
    methods: {
      perPaper,
      shared: shared.length
        ? shared.slice(0, 4).map((t) => `emphasis on ${t}`)
        : ["a shared problem framing"],
      differing: [
        "datasets and evaluation settings",
        "scale of the systems studied",
        "how results are reported",
      ],
    },
    openQuestions,
    suggestedQuestions,
  };
}

// ---------------------------------------------------------------------------
// Public entry point. Resolves to { mockMode, analysis }.
// ---------------------------------------------------------------------------
export async function analyzeCollection(collectionName, papers) {
  if (!Array.isArray(papers) || papers.length === 0) {
    throw new Error("The collection has no papers to analyze.");
  }

  if (MOCK_MODE) {
    return { mockMode: true, analysis: mockAnalysis(collectionName, papers) };
  }

  const context = buildContext(collectionName, papers);
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    thinking: { type: "disabled" },
    output_config: {
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `Analyze this collection and return the structured result.\n\n${context}`,
      },
    ],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let analysis;
  try {
    analysis = JSON.parse(text);
  } catch {
    throw new Error("The model returned a response that could not be parsed.");
  }

  return { mockMode: false, analysis };
}
