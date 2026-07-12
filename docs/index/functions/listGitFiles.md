[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / listGitFiles

# Function: listGitFiles()

> **listGitFiles**(`root`, `scope?`): `string`[] \| `null`

Defined in: [packages/agent-sdk/src/list-files.ts:21](https://github.com/zocomputer/zov2-code/blob/d124383bcfcf0ca6d96b92bff96fa6dfccc07562/packages/agent-sdk/src/list-files.ts#L21)

Candidate file list for glob/grep: one `git ls-files` spawn (tens of ms)
with exact .gitignore semantics, instead of a hand-rolled walk that has to
keep its own ignore list in sync (and used to read 2.6 GB of Rust build
output per unscoped grep). Returns repo-root-relative, forward-slash paths —
git's native output shape. `scope` (a repo-relative directory) narrows the
listing via a git pathspec. Returns null when git can't answer (not a repo,
git missing), so callers fall back to `walkFiles`.

## Parameters

### root

`string`

### scope?

`string`

## Returns

`string`[] \| `null`
