import { describe, expect, test } from "bun:test";
import { estimateSpeechCharacterCost, serializeTranscript } from "./audio-lane";

describe("audio lane helpers", () => {
  test("estimates speech exactly from current character pricing", () => {
    const estimate = estimateSpeechCharacterCost("hello", "0.000015");
    expect(estimate.confidence).toBe("exact");
    if (estimate.confidence === "exact") expect(estimate.amountUsd).toBeCloseTo(0.000075);
    expect(estimateSpeechCharacterCost("hello")).toEqual({ confidence: "unknown" });
    expect(estimateSpeechCharacterCost("hello", "invalid")).toEqual({ confidence: "unknown" });
  });

  test("serializes valid bounded caption formats", () => {
    const segments = [{ text: "Hello", startSecond: 1.25, endSecond: 2.5 }];
    expect(new TextDecoder().decode(serializeTranscript("srt", "Hello", segments).body)).toContain("00:00:01,250 --> 00:00:02,500");
    expect(new TextDecoder().decode(serializeTranscript("vtt", "Hello", segments).body)).toContain("WEBVTT\n\n00:00:01.250 --> 00:00:02.500");
    expect(JSON.parse(new TextDecoder().decode(serializeTranscript("json", "Hello", segments).body))).toEqual({ text: "Hello", segments });
  });
});
