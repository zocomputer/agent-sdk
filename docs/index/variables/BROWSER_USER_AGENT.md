[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / BROWSER\_USER\_AGENT

# Variable: BROWSER\_USER\_AGENT

> `const` **BROWSER\_USER\_AGENT**: `"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"` = `"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"`

Defined in: [packages/agent-sdk/src/web-fetch.ts:38](https://github.com/zocomputer/zov2-code/blob/71f3c28acf6f43bb252eb9f351caca137d9922f9/packages/agent-sdk/src/web-fetch.ts#L38)

Browser UA for the initial fetch; gets past naive bot filters but not
TLS-fingerprint checks (Cloudflare), which trigger the honest-UA retry.
