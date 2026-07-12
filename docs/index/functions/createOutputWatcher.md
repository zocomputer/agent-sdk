[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createOutputWatcher

# Function: createOutputWatcher()

> **createOutputWatcher**(`options`): [`OutputWatcher`](../interfaces/OutputWatcher.md)

Defined in: [packages/agent-sdk/src/watch-output.ts:49](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/watch-output.ts#L49)

Build a watcher. An invalid regex throws here — at tool-input time, where
the error surfaces as a normal tool failure the model can correct. Both
callers (bash, run_async) build the watcher before starting any work, so
"nothing was started" holds, and both take the regex as `notify.pattern`.

## Parameters

### options

[`OutputWatcherOptions`](../interfaces/OutputWatcherOptions.md)

## Returns

[`OutputWatcher`](../interfaces/OutputWatcher.md)
