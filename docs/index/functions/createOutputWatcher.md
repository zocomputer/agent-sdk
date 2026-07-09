[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createOutputWatcher

# Function: createOutputWatcher()

> **createOutputWatcher**(`options`): [`OutputWatcher`](../interfaces/OutputWatcher.md)

Defined in: [packages/agent-sdk/src/watch-output.ts:47](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/watch-output.ts#L47)

Build a watcher. An invalid regex throws here — at tool-input time, where
the error surfaces as a normal tool failure the model can correct.

## Parameters

### options

[`OutputWatcherOptions`](../interfaces/OutputWatcherOptions.md)

## Returns

[`OutputWatcher`](../interfaces/OutputWatcher.md)
