// Stream guards for gateway fetches. This hosted runtime implementation is the
// source of truth; the composed SDK subpath re-exports it.
//
// Neither eve's `defineAgent` nor the AI SDK's gateway provider exposes
// per-attempt timeouts, so a model call that hangs — headers never arrive, or
// the SSE body goes quiet mid-stream — hangs the turn forever. The one seam the
// provider does expose is `fetch`; this wrapper adds the two guards a streaming
// call needs:
//
// - **first byte**: abort when response headers don't arrive in time (the
//   request-level hang);
// - **idle**: abort when the response body goes quiet between chunks (the
//   mid-stream hang — a dropped connection the TCP stack never surfaces).
//
// Eve 0.22 retries classified provider errors delivered by a live stream and
// keeps durable event writes off the provider's token path. Neither change can
// detect a socket that emits nothing. A guard turns that silence into a network
// error that Eve/Workflow can recover from instead of waiting forever.

/** The full global fetch type, as the AI SDK's gateway provider expects. */
export type FetchLike = typeof globalThis.fetch;
/**
 * The fetch call signature alone: Bun's `typeof fetch` also carries
 * `preconnect`, which test doubles (and the wrapper itself) shouldn't have to
 * fake.
 */
export type FetchCall = (
  input: Parameters<FetchLike>[0],
  init?: Parameters<FetchLike>[1],
) => Promise<Response>;

/** First-byte and idle timeout options for stream guards. */
export interface StreamGuardOptions {
  /** Max wait for response headers, ms. */
  readonly firstByteMs: number;
  /** Max quiet gap between response-body chunks, ms. */
  readonly idleMs: number;
}

/** Generous defaults that convert a dead connection into a retryable error without racing slow-but-alive models. Headers should arrive in seconds; reasoning models can pause between chunks, so the idle guard gets minutes. */
export const DEFAULT_STREAM_GUARDS: StreamGuardOptions = {
  firstByteMs: 60_000,
  idleMs: 180_000,
};

/**
 * Wrap a fetch with first-byte and idle timeouts. The returned fetch chains
 * any caller-provided abort signal, preserves status/headers, and passes
 * body-less responses through untouched.
 */
export function withStreamGuards(
  baseFetch: FetchCall,
  options: StreamGuardOptions = DEFAULT_STREAM_GUARDS,
): FetchLike {
  const guarded: FetchCall = async (input, init) => {
    const controller = new AbortController();
    const outer = init?.signal;
    if (outer != null) {
      if (outer.aborted) controller.abort(outer.reason);
      else outer.addEventListener("abort", () => controller.abort(outer.reason), { once: true });
    }

    const firstByteTimer = setTimeout(() => {
      controller.abort(
        new Error(`gateway response headers not received within ${options.firstByteMs}ms`),
      );
    }, options.firstByteMs);

    let response: Response;
    try {
      response = await baseFetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(firstByteTimer);
    }

    const body = response.body;
    if (body === null) return response;

    // Re-wrap the body in a pull-based stream that races every read against
    // the idle timer. The timer is per-read, so a healthy stream never pays
    // more than one pending timeout, and a stalled one errors (and aborts the
    // underlying request) after exactly `idleMs` of silence.
    const reader = body.getReader();
    const guarded = new ReadableStream<Uint8Array>({
      async pull(streamController) {
        let idleTimer: ReturnType<typeof setTimeout> | undefined;
        const idle = new Promise<never>((_, reject) => {
          idleTimer = setTimeout(() => {
            const reason = new Error(`gateway stream idle for ${options.idleMs}ms`);
            controller.abort(reason);
            reject(reason);
          }, options.idleMs);
        });
        try {
          const result = await Promise.race([reader.read(), idle]);
          if (result.done) streamController.close();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- node's Response types make body a ReadableStream<any> under this package's lib config; the chunk really is a Uint8Array (the SDK copy compiles under bun's types, where it's typed).
          else streamController.enqueue(result.value);
        } catch (error) {
          await reader.cancel(error).catch(() => {});
          throw error;
        } finally {
          clearTimeout(idleTimer);
        }
      },
      async cancel(reason) {
        await reader.cancel(reason).catch(() => {});
      },
    });

    return new Response(guarded, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
  // Bun's `typeof fetch` requires `preconnect` (a DNS/TLS warm-up hint);
  // delegate to the global's so the wrapper satisfies the type under both
  // runtimes. Nothing on the request path calls it.
  return Object.assign(guarded, { preconnect: globalThis.fetch.preconnect });
}
