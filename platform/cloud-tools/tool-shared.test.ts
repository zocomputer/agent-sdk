import { describe, expect, test } from "bun:test";
import {
  ERROR_DETAIL_MAX_CHARS,
  generationFailure,
  saveFailure,
  warningText,
} from "./tool-shared";
import { StateFilesConsentError } from "./state-files";

describe("failure mapping", () => {
  test("keeps a short upstream message verbatim inside the corrective prose", () => {
    const error = generationFailure("image", new Error("model bfl/nope not found (404)"));
    expect(error.message).toContain("No image was generated");
    expect(error.message).toContain("model bfl/nope not found (404)");
  });

  test("truncates an oversized upstream detail (an HTML error page must not flood the transcript)", () => {
    const page = `<html>${"x".repeat(20_000)}</html>`;
    const error = generationFailure("video", new Error(page));
    expect(error.message.length).toBeLessThan(ERROR_DETAIL_MAX_CHARS + 500);
    expect(error.message).toContain("[truncated]");
    expect(error.message).toContain("No video was generated");
  });

  test("saveFailure truncates too, and still frames the outcome", () => {
    const error = saveFailure("image", new Error("y".repeat(20_000)));
    expect(error.message.length).toBeLessThan(ERROR_DETAIL_MAX_CHARS + 500);
    expect(error.message).toContain("no state asset was saved");
    expect(error.message).toContain("[truncated]");
  });

  test("saveFailure passes the consent steer through untouched, never truncated", () => {
    const consent = new StateFilesConsentError({
      bindingId: "stb_1",
      declarationName: "files",
      resourceName: "Files",
      party: { handle: "org_acme", external: false },
    });
    expect(saveFailure("image", consent)).toBe(consent);
  });
});

describe("warningText", () => {
  test("renders strings, errors, and JSON-able values", () => {
    expect(warningText("soft warning")).toBe("soft warning");
    expect(warningText(new Error("warn"))).toBe("warn");
    expect(warningText({ code: 3 })).toBe('{"code":3}');
  });

  test("bounds an oversized warning", () => {
    const text = warningText("w".repeat(20_000));
    expect(text.length).toBeLessThan(ERROR_DETAIL_MAX_CHARS + 100);
    expect(text).toContain("[truncated]");
  });
});
