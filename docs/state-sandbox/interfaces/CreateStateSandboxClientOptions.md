[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / CreateStateSandboxClientOptions

# Interface: CreateStateSandboxClientOptions

Defined in: [packages/agent-sdk/src/state-sandbox.ts:381](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L381)

Options for creating a sandbox client with automatic handle renewal and session caching.
The client calls `loadHandle` when the handle expires or on first use, then builds a session via `createSession`.

## Properties

### ambientEnv?

> `readonly` `optional` **ambientEnv?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:394](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L394)

Ambient runtime env a caller wants to preserve for session-scratch exec.
Durable/shared handles (`team`, `user`, `none`) never receive it.

***

### createSession

> `readonly` **createSession**: [`StateSandboxSessionFactory`](StateSandboxSessionFactory.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:385](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L385)

Creates a session from a handle, typically an SSH client connection.

***

### loadHandle

> `readonly` **loadHandle**: () => `Promise`\<[`StateSandboxHandle`](StateSandboxHandle.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:383](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L383)

Loads a fresh sandbox handle, typically by calling `requestStateSandboxHandle`.

#### Returns

`Promise`\<[`StateSandboxHandle`](StateSandboxHandle.md)\>

***

### now?

> `readonly` `optional` **now?**: () => `Date`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:387](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L387)

Returns the current time for expiry checks. Defaults to `() => new Date()`.

#### Returns

`Date`

***

### passAmbientEnvToSessionPartition?

> `readonly` `optional` **passAmbientEnvToSessionPartition?**: `boolean`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:399](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L399)

Session-partitioned scratch is the only state class allowed to inherit ambient env.
Defaults to false so durable state clients are clean-env by construction.

***

### refreshWindowMs?

> `readonly` `optional` **refreshWindowMs?**: `number`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:389](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L389)

Reload the handle and rebuild the session when it expires within this window. Defaults to 60 seconds.

***

### renewIntervalMs?

> `readonly` `optional` **renewIntervalMs?**: `number`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:416](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L416)

While work is live — an exec/file operation in flight or a spawned process
still running — the client re-mints its handle this often so the
control-plane access lease stays renewed and the lifecycle sweep never
suspends the VM under real work (a long blocking exec counts the same as
a spawned process). Renewals anchor to the last successful mint, so work
starting late in a cached handle's life renews immediately rather than
waiting a full interval. Each re-mint re-runs binding/subject
authorization; a terminal denial (401/403, or a 409 whose code is
`binding_revoked`/`consent_required`) kills the local processes and
session instead of continuing on a revoked grant, while retryable 409s
(`instance_transitioning`, `binding_repointing`) back off and retry.
Defaults to 8 minutes (inside both the 10-minute SSH TTL and the
15-minute access lease). A disposed or abandoned client stops renewing
and becomes sweep-eligible after the lease expires.
