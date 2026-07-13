import { describe, expect, test } from "bun:test";
import { MALFORMED_MEDIA_CATALOG_FIXTURES, MEDIA_CATALOG_FIXTURES } from "./media-catalog-fixtures";
import { parseMediaCatalog } from "./media-catalog-parser";
import { mediaCatalogSnapshotId } from "./media-catalog-snapshot";

describe("parseMediaCatalog", () => {
  test("normalizes all media families and pricing", () => {
    const parsed = parseMediaCatalog({ data: MEDIA_CATALOG_FIXTURES });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.map((m) => m.kind)).toEqual(["image", "video", "speech", "image", "transcription"]);
    expect(parsed.value[1]?.reportedOperations).toContain("video-editing");
    expect(parsed.value[2]?.pricing?.speechPerCharacterUsd).toBe("0.000015");
  });
  test("rejects malformed media and empty catalogs but ignores malformed language rows", () => {
    for (const raw of MALFORMED_MEDIA_CATALOG_FIXTURES) expect(parseMediaCatalog(raw).ok).toBe(false);
    expect(parseMediaCatalog({ data: [{ type: "language" }, ...MEDIA_CATALOG_FIXTURES] }).ok).toBe(true);
  });
  test("snapshot identity ignores ordering", () => {
    const parsed = parseMediaCatalog(MEDIA_CATALOG_FIXTURES); if (!parsed.ok) throw new Error(parsed.error);
    expect(mediaCatalogSnapshotId(parsed.value)).toBe(mediaCatalogSnapshotId([...parsed.value].reverse()));
  });
});
