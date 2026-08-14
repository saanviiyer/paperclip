import { describe, it, expect } from "vitest";
import {
  formatBibTeX,
  formatCitation,
  bibtexKey,
  formatCollectionBibTeX,
  parseName,
  apaAuthors,
} from "./cite";
import type { Citeable } from "./cite";

// A well-known sample paper with a real DOI.
const sample: Citeable = {
  title: "Deep learning",
  authors: ["Yann LeCun", "Yoshua Bengio", "Geoffrey Hinton"],
  year: 2015,
  venue: "Nature",
  doi: "10.1038/nature14539",
  url: "https://www.nature.com/articles/nature14539",
};

describe("parseName", () => {
  it("splits 'Given Family'", () => {
    expect(parseName("Yann LeCun")).toEqual({ family: "LeCun", given: "Yann" });
  });
  it("splits 'Family, Given'", () => {
    expect(parseName("Hinton, Geoffrey")).toEqual({
      family: "Hinton",
      given: "Geoffrey",
    });
  });
});

describe("bibtexKey", () => {
  it("is familyYEARword, lowercased", () => {
    expect(bibtexKey(sample)).toBe("lecun2015deep");
  });
});

describe("formatBibTeX", () => {
  it("produces a well-formed @article entry", () => {
    const expected = [
      "@article{lecun2015deep,",
      "  title = {Deep learning},",
      "  author = {Yann LeCun and Yoshua Bengio and Geoffrey Hinton},",
      "  year = {2015},",
      "  journal = {Nature},",
      "  doi = {10.1038/nature14539},",
      "  url = {https://www.nature.com/articles/nature14539}",
      "}",
    ].join("\n");
    expect(formatBibTeX(sample)).toBe(expected);
  });

  it("uses @misc when there is no venue", () => {
    const noVenue: Citeable = { ...sample, venue: "" };
    expect(formatBibTeX(noVenue).startsWith("@misc{")).toBe(true);
  });
});

describe("formatCollectionBibTeX", () => {
  it("de-duplicates colliding keys", () => {
    const out = formatCollectionBibTeX([sample, sample]);
    expect(out).toContain("@article{lecun2015deep,");
    expect(out).toContain("@article{lecun2015deepb,");
  });
});

describe("apaAuthors", () => {
  it("formats three authors with an ampersand before the last", () => {
    expect(apaAuthors(sample.authors)).toBe("LeCun, Y., Bengio, Y., & Hinton, G.");
  });
});

describe("formatCitation (APA)", () => {
  it("matches the expected APA string", () => {
    expect(formatCitation(sample, "apa")).toBe(
      "LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature. https://doi.org/10.1038/nature14539"
    );
  });
});

describe("formatCitation (MLA + Chicago)", () => {
  it("MLA uses et al. for three or more authors", () => {
    expect(formatCitation(sample, "mla")).toBe(
      'LeCun, Yann, et al. "Deep learning." Nature, 2015. https://doi.org/10.1038/nature14539'
    );
  });
  it("Chicago lists all authors", () => {
    expect(formatCitation(sample, "chicago")).toBe(
      'LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. "Deep learning." Nature (2015). https://doi.org/10.1038/nature14539'
    );
  });
});
