import { fetchMediaCatalog } from "../runtime-ai/catalog.ts";

import { createMediaCatalogCache } from "./media-catalog-cache";
import type { MediaResult } from "./media-contracts";
import { mediaModelsTool } from "./media-models";
import { createMediaRegistry, type MediaRegistry } from "./media-registry";

const catalog = createMediaCatalogCache({
  refresh: (validators) => fetchMediaCatalog(validators === undefined ? {} : { validators }),
});

export async function defaultMediaRegistry(): Promise<MediaResult<MediaRegistry, string>> {
  const loaded = await catalog.get();
  return loaded.ok
    ? { ok: true, value: createMediaRegistry(loaded.value.models, loaded.value.lineage) }
    : loaded;
}

export { mediaModelsTool };
export default mediaModelsTool({ registry: defaultMediaRegistry });
