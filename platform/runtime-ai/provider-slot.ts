// The AI SDK's reserved default-provider slot, as a set-once installer shared
// by `register.ts` (the stock side-effect module) and consumers that must
// construct the provider themselves (the Builder — its agent.ts bundle can't
// inline a runtime `ai` import, so it composes the provider from an app-root
// module and installs it here). Ai-free on purpose: importing this module
// never drags `ai` into a bundle.

const SLOT = "AI_SDK_DEFAULT_PROVIDER";

/**
 * Install `provider` as the AI SDK's default provider
 * (`globalThis.AI_SDK_DEFAULT_PROVIDER`, read as `?? gateway` by
 * `resolveLanguageModel` in `ai`). Set-once: a second call is a no-op, and the
 * property is locked down so a later accidental assignment throws instead of
 * silently rerouting model traffic. The value is deliberately untyped — the
 * AI SDK reads the global structurally, and typing it here would need an `ai`
 * import this module must not have.
 */
export function installZoDefaultProvider(provider: unknown): void {
  if (SLOT in globalThis) return;
  Object.defineProperty(globalThis, SLOT, {
    value: provider,
    writable: false,
    configurable: false,
    enumerable: false,
  });
}
