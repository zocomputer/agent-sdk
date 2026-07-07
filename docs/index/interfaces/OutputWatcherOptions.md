[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / OutputWatcherOptions

# Interface: OutputWatcherOptions

Defined in: [packages/agent-sdk/src/watch-output.ts:12](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/watch-output.ts#L12)

Configuration for an output watcher: the regex pattern matched against
complete output lines, debounce/cap to limit notification flood, and
injectable clock for tests.

## Properties

### debounceMs?

> `optional` **debounceMs?**: `number`

Defined in: [packages/agent-sdk/src/watch-output.ts:16](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/watch-output.ts#L16)

Minimum ms between match batches; matches inside the window drop.

***

### maxNotifications?

> `optional` **maxNotifications?**: `number`

Defined in: [packages/agent-sdk/src/watch-output.ts:18](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/watch-output.ts#L18)

Max match batches over the watcher's lifetime; later matches drop.

***

### now?

> `optional` **now?**: () => `number`

Defined in: [packages/agent-sdk/src/watch-output.ts:20](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/watch-output.ts#L20)

Clock, injectable for tests.

#### Returns

`number`

***

### pattern

> **pattern**: `string`

Defined in: [packages/agent-sdk/src/watch-output.ts:14](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/watch-output.ts#L14)

Regex source matched against complete output lines.
