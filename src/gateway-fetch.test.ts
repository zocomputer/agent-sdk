import { describe, expect, test } from "bun:test";
import { withStreamGuards } from "./gateway-fetch";

const GUARDS = { firstByteMs: 50, idleMs: 50 } as const;

function streamOf(chunks: readonly string[], options?: { hangAfter?: boolean }): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    async pull(controller) {
      const chunk = chunks[index];
      index += 1;
      if (chunk !== undefined) {
        controller.enqueue(encoder.encode(chunk));
        return;
      }
      if (options?.hangAfter === true) {
        // Never resolve another chunk and never close: a dropped connection
        // the TCP stack hasn't noticed.
        await new Promise<never>(() => {});
        return;
      }
      controller.close();
    },
  });
}

async function readAll(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (body === null) return "";
  const decoder = new TextDecoder();
  let text = "";
  for await (const chunk of body) text += decoder.decode(chunk, { stream: true });
  return text;
}

describe("withStreamGuards", () => {
  test("a healthy streaming response passes through with status and headers", async () => {
    const guarded = withStreamGuards(
      async () =>
        new Response(streamOf(["hel", "lo"]), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      GUARDS,
    );
    const response = await guarded("https://gateway.test/v1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(await readAll(response.body)).toBe("hello");
  });

  test("a body-less response passes through untouched", async () => {
    const original = new Response(null, { status: 204 });
    const guarded = withStreamGuards(async () => original, GUARDS);
    expect(await guarded("https://gateway.test/v1")).toBe(original);
  });

  test("headers that never arrive reject after firstByteMs", async () => {
    const guarded = withStreamGuards(
      (_input, init) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason ?? new Error("aborted"));
          });
        }),
      GUARDS,
    );
    expect(guarded("https://gateway.test/v1")).rejects.toThrow(/headers not received within 50ms/);
  });

  test("a mid-stream stall errors the body after idleMs", async () => {
    const guarded = withStreamGuards(
      async () => new Response(streamOf(["first "], { hangAfter: true })),
      GUARDS,
    );
    const response = await guarded("https://gateway.test/v1");
    expect(readAll(response.body)).rejects.toThrow(/stream idle for 50ms/);
  });

  test("chunks slower than idleMs in total but faster per gap pass", async () => {
    // Three chunks with 20ms gaps: total > idleMs (50ms), but each gap is
    // under it — the guard is per-read, not end-to-end.
    const encoder = new TextEncoder();
    const chunks = ["a", "b", "c"];
    let index = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const chunk = chunks[index];
        index += 1;
        if (chunk === undefined) {
          controller.close();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
        controller.enqueue(encoder.encode(chunk));
      },
    });
    const guarded = withStreamGuards(async () => new Response(body), GUARDS);
    const response = await guarded("https://gateway.test/v1");
    expect(await readAll(response.body)).toBe("abc");
  });

  test("an outer abort signal propagates to the base fetch", async () => {
    const outer = new AbortController();
    const guarded = withStreamGuards(
      (_input, init) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason ?? new Error("aborted"));
          });
        }),
      { firstByteMs: 10_000, idleMs: 10_000 },
    );
    const pending = guarded("https://gateway.test/v1", { signal: outer.signal });
    outer.abort(new Error("caller gave up"));
    expect(pending).rejects.toThrow("caller gave up");
  });
});
