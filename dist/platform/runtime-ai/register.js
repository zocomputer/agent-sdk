// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/runtime-ai/gateway.ts
import { createGateway } from "ai";

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/runtime-ai/session-fetch.ts
var EVE_SESSION_HEADER = "x-zo-eve-session";
var EVE_TURN_HEADER = "x-zo-eve-turn";
var EVE_SUBAGENT_SESSION_HEADER = "x-zo-eve-subagent-session";
var EVE_CONTEXT_STORAGE_KEY = Symbol.for("eve.context-storage");
var SESSION_ID_KEY_NAME = "eve.sessionId";
var SESSION_KEY_NAME = "eve.session";
var PARENT_SESSION_KEY_NAME = "eve.parentSession";
function hasMethod(value, name) {
  return typeof value === "object" && value !== null && typeof value[name] === "function";
}
function ambientEveSessionId() {
  const value = ambientContextValue(SESSION_ID_KEY_NAME);
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
function ambientSessionParent() {
  const parent = ambientContextValue(PARENT_SESSION_KEY_NAME);
  if (typeof parent !== "object" || parent === null)
    return null;
  const rootSessionId = parent["rootSessionId"];
  const sessionId = parent["sessionId"];
  if (typeof rootSessionId !== "string" || rootSessionId.trim().length === 0)
    return null;
  if (typeof sessionId !== "string" || sessionId.trim().length === 0)
    return null;
  return { rootSessionId, sessionId };
}
function ambientEveTurnId() {
  const session = ambientContextValue(SESSION_KEY_NAME);
  if (typeof session !== "object" || session === null)
    return;
  const turn = session["turn"];
  if (typeof turn !== "object" || turn === null)
    return;
  const id = turn["id"];
  return typeof id === "string" && id.trim().length > 0 ? id : undefined;
}
function ambientContextValue(keyName) {
  const storage = Reflect.get(globalThis, EVE_CONTEXT_STORAGE_KEY);
  if (!hasMethod(storage, "getStore"))
    return;
  const store = storage.getStore();
  if (!hasMethod(store, "get"))
    return;
  return store.get({ name: keyName });
}
function eveSessionFetch(getSessionId = ambientEveSessionId, baseFetch = globalThis.fetch, getTurnId = ambientEveTurnId, getSessionParent = ambientSessionParent) {
  return Object.assign((input, init) => {
    const sessionId = getSessionId()?.trim();
    if (!sessionId)
      return baseFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const parent = getSessionParent();
    headers.set(EVE_SESSION_HEADER, parent?.rootSessionId ?? sessionId);
    const turnId = getTurnId()?.trim();
    if (turnId)
      headers.set(EVE_TURN_HEADER, turnId);
    else
      headers.delete(EVE_TURN_HEADER);
    if (parent)
      headers.set(EVE_SUBAGENT_SESSION_HEADER, sessionId);
    else
      headers.delete(EVE_SUBAGENT_SESSION_HEADER);
    return baseFetch(input, { ...init, headers });
  }, baseFetch);
}

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/runtime-ai/stream-guards.ts
var DEFAULT_STREAM_GUARDS = {
  firstByteMs: 60000,
  idleMs: 180000
};
function withStreamGuards(baseFetch, options = DEFAULT_STREAM_GUARDS) {
  const guarded = async (input, init) => {
    const controller = new AbortController;
    const outer = init?.signal;
    if (outer != null) {
      if (outer.aborted)
        controller.abort(outer.reason);
      else
        outer.addEventListener("abort", () => controller.abort(outer.reason), { once: true });
    }
    const firstByteTimer = setTimeout(() => {
      controller.abort(new Error(`gateway response headers not received within ${options.firstByteMs}ms`));
    }, options.firstByteMs);
    let response;
    try {
      response = await baseFetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(firstByteTimer);
    }
    const body = response.body;
    if (body === null)
      return response;
    const reader = body.getReader();
    const guarded2 = new ReadableStream({
      async pull(streamController) {
        let idleTimer;
        const idle = new Promise((_, reject) => {
          idleTimer = setTimeout(() => {
            const reason = new Error(`gateway stream idle for ${options.idleMs}ms`);
            controller.abort(reason);
            reject(reason);
          }, options.idleMs);
        });
        try {
          const result = await Promise.race([reader.read(), idle]);
          if (result.done)
            streamController.close();
          else
            streamController.enqueue(result.value);
        } catch (error) {
          await reader.cancel(error).catch(() => {});
          throw error;
        } finally {
          clearTimeout(idleTimer);
        }
      },
      async cancel(reason) {
        await reader.cancel(reason).catch(() => {});
      }
    });
    return new Response(guarded2, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };
  return Object.assign(guarded, { preconnect: globalThis.fetch.preconnect });
}

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/runtime-ai/gateway-config.ts
var DEFAULT_ZO_AI_BASE_URL = "http://localhost:4000/runtime/ai/v4/ai";
var DEFAULT_ZO_AI_KEY = "dev-proxy";
var AGENT_TOKEN_HEADER = "x-zo-agent-token";
var AGENT_TOKEN_ENV = "ZO_AGENT_TOKEN";
function agentAuthHeaders(token = process.env[AGENT_TOKEN_ENV]) {
  const trimmed = token?.trim();
  return trimmed ? { [AGENT_TOKEN_HEADER]: trimmed } : {};
}
function resolveZoGatewayBaseUrl(baseURL = process.env.ZO_AI_BASE_URL) {
  const trimmed = baseURL?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_BASE_URL;
}
function resolveZoGatewayApiKey(apiKey = process.env.ZO_AI_KEY) {
  const trimmed = apiKey?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ZO_AI_KEY;
}
function zoGatewaySettings(options = {}) {
  return {
    ...options,
    headers: { ...agentAuthHeaders(), ...options.headers },
    apiKey: resolveZoGatewayApiKey(options.apiKey),
    baseURL: resolveZoGatewayBaseUrl(options.baseURL),
    fetch: withStreamGuards(eveSessionFetch(undefined, options.fetch))
  };
}

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/runtime-ai/gateway.ts
function zoGateway(options = {}) {
  return createGateway(zoGatewaySettings(options));
}

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/runtime-ai/provider-slot.ts
var SLOT = "AI_SDK_DEFAULT_PROVIDER";
function installZoDefaultProvider(provider) {
  if (SLOT in globalThis)
    return;
  Object.defineProperty(globalThis, SLOT, {
    value: provider,
    writable: false,
    configurable: false,
    enumerable: false
  });
}

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/runtime-ai/validated-compaction.ts
var COMPACTION_SENTINEL = "You are a conversation summarizer.";
var RECOVERED_CONTEXT_HEADER = "## Recovered context (compaction audit)";
var DEFAULT_MAX_RECOVERED_CHARS = 2000;
var DEFAULT_MAX_RECOVERED_FACTS = 12;
var DEFAULT_JUDGE_MAX_OUTPUT_TOKENS = 1024;
var DEFAULT_JUDGE_TIMEOUT_MS = 60000;
function buildValidationSystemPrompt(maxFacts) {
  return [
    "You audit conversation summaries for information loss.",
    "You will receive the original conversation transcript and a candidate summary of it.",
    "Identify concrete, load-bearing facts present in the transcript but missing from the summary:",
    "task goals and their status, files or paths modified, decisions and their reasons, constraints,",
    "open questions, pending verification steps, exact identifiers (names, commands, versions, URLs).",
    "Reply with exactly `NOTHING MISSING` if the summary preserves everything needed.",
    "Otherwise reply with one missing fact per line, each line starting with `- `,",
    `most important first, at most ${maxFacts} lines, no other text.`
  ].join(" ");
}
function parseJudgeVerdict(text) {
  if (/^nothing missing[.!]?$/i.test(text.trim())) {
    return { kind: "nothing-missing" };
  }
  const facts = [];
  for (const line of text.split(`
`)) {
    const match = /^\s*[-*]\s+(.+)$/.exec(line);
    const fact = match?.[1]?.trim();
    if (fact !== undefined && fact !== "")
      facts.push(fact);
  }
  if (facts.length === 0)
    return { kind: "nothing-missing" };
  return { kind: "missing", facts };
}
function buildRecoverySection(facts, maxChars) {
  const intro = "Facts from the pre-compaction transcript the summary above omitted:";
  let text = `${RECOVERED_CONTEXT_HEADER}
${intro}`;
  let kept = 0;
  for (const fact of facts) {
    const withFact = `${text}
- ${fact}`;
    if (withFact.length > maxChars)
      break;
    text = withFact;
    kept += 1;
  }
  if (kept === 0)
    return null;
  return { text, kept, truncated: kept < facts.length };
}
function extractTranscript(prompt) {
  const chunks = [];
  for (const message of prompt) {
    if (message.role !== "user")
      continue;
    for (const part of message.content) {
      if (part.type === "text" && part.text !== "")
        chunks.push(part.text);
    }
  }
  return chunks.join(`

`);
}
function isTextContent(part) {
  return part.type === "text";
}
function extractText(content) {
  return content.filter(isTextContent).map((part) => part.text).join("");
}
function withValidatedCompaction(model, options = {}) {
  const maxRecoveredChars = options.maxRecoveredChars ?? DEFAULT_MAX_RECOVERED_CHARS;
  const maxRecoveredFacts = options.maxRecoveredFacts ?? DEFAULT_MAX_RECOVERED_FACTS;
  const judgeMaxOutputTokens = options.judgeMaxOutputTokens ?? DEFAULT_JUDGE_MAX_OUTPUT_TOKENS;
  const judgeTimeoutMs = options.judgeTimeoutMs ?? DEFAULT_JUDGE_TIMEOUT_MS;
  const judgeSystemPrompt = options.validationSystemPrompt ?? buildValidationSystemPrompt(maxRecoveredFacts);
  const emit = (report) => {
    try {
      options.onValidation?.(report);
    } catch {}
  };
  const validate = async (params, result) => {
    const transcript = extractTranscript(params.prompt);
    if (transcript === "") {
      emit({ kind: "skipped", reason: "no-transcript" });
      return result;
    }
    const candidate = extractText(result.content);
    if (candidate.trim() === "") {
      emit({ kind: "skipped", reason: "no-summary-text" });
      return result;
    }
    let judgeText;
    try {
      const signals = [AbortSignal.timeout(judgeTimeoutMs)];
      if (params.abortSignal)
        signals.push(params.abortSignal);
      const judgeResult = await model.doGenerate({
        prompt: [
          { role: "system", content: judgeSystemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Original conversation transcript:
<transcript>
${transcript}
</transcript>

Candidate summary:
<summary>
${candidate}
</summary>`
              }
            ]
          }
        ],
        temperature: 0,
        maxOutputTokens: judgeMaxOutputTokens,
        abortSignal: AbortSignal.any(signals),
        ...params.headers !== undefined && { headers: params.headers },
        ...params.providerOptions !== undefined && {
          providerOptions: params.providerOptions
        }
      });
      judgeText = extractText(judgeResult.content);
    } catch (error) {
      emit({ kind: "judge-error", error });
      return result;
    }
    const verdict = parseJudgeVerdict(judgeText);
    if (verdict.kind === "nothing-missing") {
      emit({ kind: "nothing-missing", judgeText });
      return result;
    }
    const capped = verdict.facts.slice(0, maxRecoveredFacts);
    const cappedByCount = capped.length < verdict.facts.length;
    const section = buildRecoverySection(capped, maxRecoveredChars);
    if (section === null) {
      emit({ kind: "nothing-missing", judgeText });
      return result;
    }
    const lastTextIndex = result.content.findLastIndex(isTextContent);
    const lastText = result.content[lastTextIndex];
    if (lastText === undefined || !isTextContent(lastText)) {
      emit({ kind: "skipped", reason: "no-summary-text" });
      return result;
    }
    const appended = `

${section.text}`;
    const content = result.content.map((part, index) => index === lastTextIndex && isTextContent(part) ? { ...part, text: part.text + appended } : part);
    emit({
      kind: "repaired",
      facts: capped.slice(0, section.kept),
      truncated: section.truncated || cappedByCount,
      appendedChars: appended.length
    });
    return { ...result, content };
  };
  return {
    specificationVersion: "v4",
    provider: model.provider,
    modelId: model.modelId,
    get supportedUrls() {
      return model.supportedUrls;
    },
    async doGenerate(params) {
      const first = params.prompt[0];
      const isCompaction = first !== undefined && first.role === "system" && first.content.startsWith(COMPACTION_SENTINEL);
      if (!isCompaction)
        return model.doGenerate(params);
      const result = await model.doGenerate(params);
      return validate(params, result);
    },
    doStream(params) {
      return model.doStream(params);
    }
  };
}
function withValidatedCompactionProvider(provider, options = {}) {
  const wrap = (model) => withValidatedCompaction(model, options);
  return new Proxy(provider, {
    apply(target, _thisArg, args) {
      return wrap(target(...args));
    },
    get(target, property, receiver) {
      if (property === "languageModel" || property === "chat") {
        const mint = target[property].bind(target);
        return (modelId) => wrap(mint(modelId));
      }
      return Reflect.get(target, property, receiver);
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-xLWWW2/repo/platform/runtime-ai/register.ts
installZoDefaultProvider(withValidatedCompactionProvider(zoGateway()));
