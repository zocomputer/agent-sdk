[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [attachments](../README.md) / ChatAttachment

# Type Alias: ChatAttachment

> **ChatAttachment** = \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \} \| \{ `dataUrl`: `string`; `filename`: `string`; `kind`: `"video"`; `mediaType`: `string`; \} \| \{ `dataUrl`: `string`; `filename`: `string`; `kind`: `"audio"`; `mediaType`: `string`; \}

Defined in: [packages/agent-sdk/src/attachments.ts:40](https://github.com/zocomputer/zov2-code/blob/346fe3cc1f4b2813234e8cc0980e7a87e8c918ea/packages/agent-sdk/src/attachments.ts#L40)

A model-hidden media payload smuggled on a read/webfetch result, carrying bytes as a data URL for client redelivery.

## Union Members

### Type Literal

\{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}

#### dataUrl

> `readonly` **dataUrl**: `string`

A `data:` URL (base64) — drop straight into an AI SDK file part's `data`.

#### filename

> `readonly` **filename**: `string`

#### height

> `readonly` **height**: `number` \| `null`

#### kind

> `readonly` **kind**: `"image"`

#### mediaType

> `readonly` **mediaType**: `string`

e.g. `image/png`, `image/jpeg`.

#### width

> `readonly` **width**: `number` \| `null`

***

### Type Literal

\{ `dataUrl`: `string`; `filename`: `string`; `kind`: `"video"`; `mediaType`: `string`; \}

#### dataUrl

> `readonly` **dataUrl**: `string`

#### filename

> `readonly` **filename**: `string`

#### kind

> `readonly` **kind**: `"video"`

#### mediaType

> `readonly` **mediaType**: `string`

e.g. `video/mp4`, `video/webm`.

***

### Type Literal

\{ `dataUrl`: `string`; `filename`: `string`; `kind`: `"audio"`; `mediaType`: `string`; \}

#### dataUrl

> `readonly` **dataUrl**: `string`

#### filename

> `readonly` **filename**: `string`

#### kind

> `readonly` **kind**: `"audio"`

#### mediaType

> `readonly` **mediaType**: `string`

e.g. `audio/mpeg`, `audio/wav`.
