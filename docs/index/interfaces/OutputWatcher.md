[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / OutputWatcher

# Interface: OutputWatcher

Defined in: [packages/agent-sdk/src/watch-output.ts:28](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/watch-output.ts#L28)

A live output watcher for background commands: feed it output chunks, get
back the complete lines that match the regex — debounced and capped so a
chatty pattern can't flood the session.

## Methods

### feed()

> **feed**(`chunk`): `string`[] \| `null`

Defined in: [packages/agent-sdk/src/watch-output.ts:33](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/watch-output.ts#L33)

Consume an output chunk (any framing — watcher handles line buffering).
Returns the matching complete lines that clear debounce/cap, or null.

#### Parameters

##### chunk

`string`

#### Returns

`string`[] \| `null`

***

### flush()

> **flush**(): `string`[] \| `null`

Defined in: [packages/agent-sdk/src/watch-output.ts:35](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/watch-output.ts#L35)

Flush the unterminated tail as a final line (call when the command ends).

#### Returns

`string`[] \| `null`
