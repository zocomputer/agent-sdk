// Pure output watcher for background commands: feed it output chunks, get back
// the complete lines that match a regex — debounced and capped so a chatty
// pattern can't flood the session with notification turns. The effect side
// (posting a park notification per match batch) lives with the tools; this
// module is the testable decision core.

/**
 * Configuration for an output watcher: the regex pattern matched against
 * complete output lines, debounce/cap to limit notification flood, and
 * injectable clock for tests.
 */
export interface OutputWatcherOptions {
  /** Regex source matched against complete output lines. */
  pattern: string;
  /** Minimum ms between match batches; matches inside the window drop. */
  debounceMs?: number | undefined;
  /** Max match batches over the watcher's lifetime; later matches drop. */
  maxNotifications?: number;
  /** Clock, injectable for tests. */
  now?: () => number;
}

/**
 * A live output watcher for background commands: feed it output chunks, get
 * back the complete lines that match the regex — debounced and capped so a
 * chatty pattern can't flood the session.
 */
export interface OutputWatcher {
  /**
   * Consume an output chunk (any framing — watcher handles line buffering).
   * Returns the matching complete lines that clear debounce/cap, or null.
   */
  feed(chunk: string): string[] | null;
  /** Flush the unterminated tail as a final line (call when the command ends). */
  flush(): string[] | null;
}

/** Minimum ms between match batches; matches inside the window drop. */
export const DEFAULT_WATCH_DEBOUNCE_MS = 5_000;
/** Max match batches over one watcher's lifetime; later matches drop. */
export const DEFAULT_MAX_WATCH_NOTIFICATIONS = 5;

/**
 * Build a watcher. An invalid regex throws here — at tool-input time, where
 * the error surfaces as a normal tool failure the model can correct.
 */
export function createOutputWatcher(options: OutputWatcherOptions): OutputWatcher {
  const regex = new RegExp(options.pattern);
  const debounceMs = options.debounceMs ?? DEFAULT_WATCH_DEBOUNCE_MS;
  const maxNotifications = options.maxNotifications ?? DEFAULT_MAX_WATCH_NOTIFICATIONS;
  const now = options.now ?? Date.now;

  let buffer = "";
  let notifications = 0;
  let lastNotifiedAt: number | null = null;

  function emit(lines: string[]): string[] | null {
    const matches = lines.filter((line) => regex.test(line));
    if (matches.length === 0) return null;
    if (notifications >= maxNotifications) return null;
    const at = now();
    if (lastNotifiedAt !== null && at - lastNotifiedAt < debounceMs) return null;
    notifications += 1;
    lastNotifiedAt = at;
    return matches;
  }

  return {
    feed(chunk) {
      buffer += chunk;
      const parts = buffer.split("\n");
      // The last part is an unterminated tail; keep buffering it.
      buffer = parts.pop() ?? "";
      return emit(parts);
    },
    flush() {
      if (buffer.length === 0) return null;
      const tail = buffer;
      buffer = "";
      // Bypass debounce for the final output: a command ending is the signal.
      const matches = [tail].filter((line) => regex.test(line));
      if (matches.length === 0) return null;
      if (notifications >= maxNotifications) return null;
      notifications += 1;
      lastNotifiedAt = now();
      return matches;
    },
  };
}

/** The message text for a watcher match, complete and self-describing. */
export function formatWatchNotification(opts: {
  taskId: string;
  label: string;
  reason: string;
  lines: readonly string[];
}): string {
  return (
    `Background task ${opts.taskId} (${opts.label}) — ${opts.reason}. ` +
    `Output matched your watch pattern:\n${opts.lines.join("\n")}`
  );
}

/** The message text for a completion notice (run_async notify_on_complete). */
export function formatCompletionNotification(opts: {
  taskId: string;
  label: string;
  status: "done" | "error";
  error?: string;
}): string {
  const outcome =
    opts.status === "done"
      ? "finished"
      : `failed${opts.error ? `: ${opts.error}` : ""}`;
  return `Background task ${opts.taskId} (${opts.label}) ${outcome}. Call await_task to collect its result.`;
}
