import { describe, expect, test } from "bun:test";
import {
  capabilitiesForModel,
  capabilitiesFromCatalogEntry,
  describeCapabilities,
  MEDIA_CAPABILITY_OVERLAY,
  modelFamily,
  TEXT_ONLY_CAPABILITIES,
} from "./model-capabilities";

// Catalog shapes observed live at https://ai-gateway.vercel.sh/v1/models
// (2026-07-07): vision + file-input on the frontier models, neither on GLM.
const CATALOG = [
  {
    id: "anthropic/claude-opus-4.8",
    tags: ["tool-use", "reasoning", "vision", "file-input", "explicit-caching"],
  },
  {
    id: "google/gemini-3-flash",
    tags: ["reasoning", "file-input", "vision", "tool-use"],
  },
  { id: "zai/glm-5.2", tags: ["reasoning", "tool-use", "implicit-caching"] },
  { id: "mystery/no-tags", tags: undefined },
] as const;

describe("capabilitiesFromCatalogEntry", () => {
  test("vision → image, file-input → pdf; video/audio never from tags", () => {
    expect(capabilitiesFromCatalogEntry({ tags: ["vision", "file-input"] })).toEqual({
      image: true,
      pdf: true,
      video: false,
      audio: false,
    });
  });

  test("no relevant tags → text only", () => {
    expect(capabilitiesFromCatalogEntry({ tags: ["reasoning", "tool-use"] })).toEqual(
      TEXT_ONLY_CAPABILITIES,
    );
  });

  test("missing tags → text only", () => {
    expect(capabilitiesFromCatalogEntry({ tags: undefined })).toEqual(
      TEXT_ONLY_CAPABILITIES,
    );
  });
});

describe("modelFamily", () => {
  test("creator segment, lowercased", () => {
    expect(modelFamily("google/gemini-3-flash")).toBe("google");
    expect(modelFamily("Google/gemini")).toBe("google");
  });

  test("no slash (or a leading slash) carries no family signal", () => {
    expect(modelFamily("gemini-3-flash")).toBe("");
    expect(modelFamily("/oddity")).toBe("");
  });
});

describe("capabilitiesForModel", () => {
  test("catalog tags decide image/pdf", () => {
    expect(capabilitiesForModel("anthropic/claude-opus-4.8", CATALOG)).toEqual({
      image: true,
      pdf: true,
      video: false,
      audio: false,
    });
  });

  test("text-only models resolve honestly", () => {
    expect(capabilitiesForModel("zai/glm-5.2", CATALOG)).toEqual(TEXT_ONLY_CAPABILITIES);
  });

  test("the google overlay adds video+audio on top of the catalog tags", () => {
    expect(capabilitiesForModel("google/gemini-3-flash", CATALOG)).toEqual({
      image: true,
      pdf: true,
      video: true,
      audio: true,
    });
  });

  test("the overlay applies even when the catalog misses the model entirely", () => {
    // A brand-new Gemini model not yet in the checked catalog snapshot still
    // gets the family's video/audio; image/pdf stay false without attestation.
    expect(capabilitiesForModel("google/gemini-99", CATALOG)).toEqual({
      image: false,
      pdf: false,
      video: true,
      audio: true,
    });
  });

  test("unknown model, no overlay family → conservative text only", () => {
    expect(capabilitiesForModel("unknown/model", CATALOG)).toEqual(
      TEXT_ONLY_CAPABILITIES,
    );
    expect(capabilitiesForModel("bare-id", CATALOG)).toEqual(TEXT_ONLY_CAPABILITIES);
  });

  test("the overlay only adds — it never removes a catalog-attested capability", () => {
    for (const overlay of Object.values(MEDIA_CAPABILITY_OVERLAY)) {
      for (const value of Object.values(overlay)) {
        expect(value).toBe(true);
      }
    }
  });
});

describe("describeCapabilities", () => {
  test("full set", () => {
    expect(
      describeCapabilities({ image: true, pdf: true, video: true, audio: true }),
    ).toBe("can view images, PDFs, video, and audio");
  });

  test("partial set names both halves", () => {
    expect(
      describeCapabilities({ image: true, pdf: true, video: false, audio: false }),
    ).toBe("can view images and PDFs, but not video or audio");
  });

  test("single capability", () => {
    expect(
      describeCapabilities({ image: true, pdf: false, video: false, audio: false }),
    ).toBe("can view images, but not PDFs, video, or audio");
  });

  test("text only", () => {
    expect(describeCapabilities(TEXT_ONLY_CAPABILITIES)).toBe(
      "can view text only (no images, PDFs, video, or audio)",
    );
  });
});
