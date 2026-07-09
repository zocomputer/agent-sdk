import { zoGateway } from "./gateway";
import { withValidatedCompactionProvider } from "./validated-compaction";

// Register the Zo gateway as the AI SDK's default provider
// (`globalThis.AI_SDK_DEFAULT_PROVIDER`, read as `?? gateway` by
// `resolveLanguageModel` in `ai`). With the slot pointed at our /runtime/ai
// proxy, agent.ts can use a bare catalog slug — eve classifies a string model
// as gateway-routed, so provider-executed built-ins like web_search stay
// attached and the context window auto-resolves. A wrapped gateway *instance*
// instead gets web_search silently deleted (eve can't map its "gateway/…" id
// to a search backend). Import once, first, from agent.ts; never set the slot
// anywhere else. A missed override fails loud, not leaky: agents hold no real
// gateway key, so calls 401 at the real gateway instead of bypassing metering.
// See plans/ray/eve-web-search-under-gateway-models.md (Option B).
//
// The provider is wrapped with validated compaction: eve's compaction summary
// (the only doGenerate traffic on a turn model — turns stream) gets judged
// against the transcript it replaces and repaired in place when it dropped
// load-bearing facts. The wrap lives at the provider so agents keep their bare
// string slugs (see above — wrapping a model instance breaks web_search).

const SLOT = "AI_SDK_DEFAULT_PROVIDER";

if (!(SLOT in globalThis)) {
  Object.defineProperty(globalThis, SLOT, {
    value: withValidatedCompactionProvider(zoGateway()),
    // Locked down so a later accidental assignment throws instead of silently
    // rerouting model traffic.
    writable: false,
    configurable: false,
    enumerable: false,
  });
}
