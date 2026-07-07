[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / CreateStateSandboxClientOptions

# Interface: CreateStateSandboxClientOptions

Defined in: [packages/agent-sdk/src/state-sandbox.ts:362](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/state-sandbox.ts#L362)

Options for creating a sandbox client with automatic handle renewal and session caching.
The client calls `loadHandle` when the handle expires or on first use, then builds a session via `createSession`.

## Properties

### ambientEnv?

> `readonly` `optional` **ambientEnv?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:375](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/state-sandbox.ts#L375)

Ambient runtime env a caller wants to preserve for session-scratch exec.
Durable/shared handles (`team`, `user`, `none`) never receive it.

***

### createSession

> `readonly` **createSession**: [`StateSandboxSessionFactory`](StateSandboxSessionFactory.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:366](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/state-sandbox.ts#L366)

Creates a session from a handle, typically an SSH client connection.

***

### loadHandle

> `readonly` **loadHandle**: () => `Promise`\<[`StateSandboxHandle`](StateSandboxHandle.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:364](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/state-sandbox.ts#L364)

Loads a fresh sandbox handle, typically by calling `requestStateSandboxHandle`.

#### Returns

`Promise`\<[`StateSandboxHandle`](StateSandboxHandle.md)\>

***

### now?

> `readonly` `optional` **now?**: () => `Date`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:368](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/state-sandbox.ts#L368)

Returns the current time for expiry checks. Defaults to `() => new Date()`.

#### Returns

`Date`

***

### passAmbientEnvToSessionPartition?

> `readonly` `optional` **passAmbientEnvToSessionPartition?**: `boolean`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:380](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/state-sandbox.ts#L380)

Session-partitioned scratch is the only state class allowed to inherit ambient env.
Defaults to false so durable state clients are clean-env by construction.

***

### refreshWindowMs?

> `readonly` `optional` **refreshWindowMs?**: `number`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:370](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/state-sandbox.ts#L370)

Reload the handle and rebuild the session when it expires within this window. Defaults to 60 seconds.
