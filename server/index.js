import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

import { fetchByDoi, looksLikeDoi } from "./crossref.js";
import { fetchByArxiv } from "./arxiv.js";
import {
  extractPdfText,
  findDoi,
  guessMetadata,
  abstractPreview,
  MAX_UPLOAD_BYTES,
} from "./parse.js";
import { analyzeCollection, MOCK_MODE, MODEL } from "./ai.js";

dotenv.config();

const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, "../client/dist");

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.static(CLIENT_DIST));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mockMode: MOCK_MODE, model: MODEL });
});

// ---------------------------------------------------------------------------
// Metadata by DOI (CrossRef)
// ---------------------------------------------------------------------------
app.post("/api/metadata/doi", async (req, res) => {
  const { doi = "" } = req.body || {};
  if (!doi.trim()) return res.status(400).json({ error: "Provide a DOI." });
  try {
    const paper = await fetchByDoi(doi);
    res.json({ paper });
  } catch (err) {
    console.error("doi error:", err.message);
    res.status(502).json({ error: err.message || "DOI lookup failed." });
  }
});

// ---------------------------------------------------------------------------
// Metadata by arXiv id / URL
// ---------------------------------------------------------------------------
app.post("/api/metadata/arxiv", async (req, res) => {
  const { id = "" } = req.body || {};
  if (!id.trim()) return res.status(400).json({ error: "Provide an arXiv id or URL." });
  try {
    const paper = await fetchByArxiv(id);
    res.json({ paper });
  } catch (err) {
    console.error("arxiv error:", err.message);
    res.status(502).json({ error: err.message || "arXiv lookup failed." });
  }
});

// ---------------------------------------------------------------------------
// Metadata from an uploaded PDF: extract text, then a DOI (-> CrossRef) or a
// first-page heuristic guess. Multipart field "file".
// ---------------------------------------------------------------------------
app.post("/api/metadata/pdf", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No PDF uploaded." });
  try {
    const text = await extractPdfText(req.file.buffer);
    if (!text || text.trim().length < 40) {
      return res.status(422).json({
        error:
          "Could not extract usable text from that PDF (it may be a scanned image). Try a text-based PDF or add the paper by DOI instead.",
      });
    }

    const doi = findDoi(text);
    let paper;
    let via = "heuristic";

    if (doi && looksLikeDoi(doi)) {
      try {
        paper = await fetchByDoi(doi);
        via = "crossref";
      } catch {
        // Fall back to heuristics if CrossRef can't resolve the scraped DOI.
      }
    }

    if (!paper) {
      const guess = guessMetadata(text);
      paper = {
        title: guess.title || req.file.originalname.replace(/\.pdf$/i, ""),
        authors: guess.authors,
        year: null,
        venue: "",
        abstract: abstractPreview(text),
        doi: doi || "",
        url: "",
        source: "pdf",
      };
    }

    // Attach the extracted text so the client can store it for richer AI analysis.
    paper.source = "pdf";
    paper.pdfText = text.slice(0, 20000);

    res.json({ paper, via, filename: req.file.originalname, chars: text.length });
  } catch (err) {
    console.error("pdf error:", err.message);
    res.status(400).json({ error: err.message || "Failed to process the PDF." });
  }
});

// ---------------------------------------------------------------------------
// Cross-paper AI analysis of a collection.
// Body: { collectionName, papers: [{ title, authors, year, venue, abstract, doi, pdfText }] }
// ---------------------------------------------------------------------------
app.post("/api/analyze", async (req, res) => {
  const { collectionName = "", papers = [] } = req.body || {};
  if (!Array.isArray(papers) || papers.length === 0) {
    return res.status(400).json({ error: "The collection has no papers to analyze." });
  }
  try {
    const { mockMode, analysis } = await analyzeCollection(collectionName, papers);
    res.json({ mockMode, analysis });
  } catch (err) {
    console.error("analyze error:", err.message);
    res.status(500).json({ error: err.message || "Analysis failed." });
  }
});

// Multer errors (e.g. file too large).
app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload failed: ${err.message}` });
  }
  next(err);
});

// SPA catch-all.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(CLIENT_DIST, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  const aiMode = MOCK_MODE ? "MOCK MODE — no API key" : `LIVE — ${MODEL}`;
  console.log(`paperclip server on http://localhost:${PORT}  [AI: ${aiMode}]`);
});
