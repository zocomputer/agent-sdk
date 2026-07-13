import type { MediaAssetRef, ResolvedMediaAsset } from "./media-contracts";

export type ProviderMediaInput =
  | { readonly delivery: "bytes"; readonly body: Uint8Array; readonly contentType: string }
  | { readonly delivery: "url"; readonly url: URL; readonly contentType: string };

export interface ProviderMediaInputResolverOptions {
  readonly read: (ref: MediaAssetRef, limits: { readonly maxBytes: number }) => Promise<ResolvedMediaAsset>;
  readonly resolveUrl?: (ref: MediaAssetRef, expiresInSeconds: number) => Promise<URL>;
}

export function createProviderMediaInputResolver(options: ProviderMediaInputResolverOptions) {
  return async function resolveProviderMediaInput(request: {
    readonly ref: MediaAssetRef;
    readonly delivery: "bytes" | "url";
    readonly maxBytes: number;
    readonly acceptedKinds: readonly ResolvedMediaAsset["kind"][];
    readonly urlExpiresInSeconds?: number;
  }): Promise<ProviderMediaInput> {
    const asset = await options.read(request.ref, { maxBytes: request.maxBytes });
    if (!request.acceptedKinds.includes(asset.kind)) {
      throw new Error(`media asset has unsupported kind "${asset.kind}"`);
    }
    if (request.delivery === "bytes") {
      return { delivery: "bytes", body: asset.body, contentType: asset.contentType };
    }
    if (options.resolveUrl === undefined) {
      throw new Error("this provider requires internal URL delivery, but no trusted URL resolver is configured");
    }
    try {
      const url = await options.resolveUrl(asset.ref, request.urlExpiresInSeconds ?? 300);
      return { delivery: "url", url, contentType: asset.contentType };
    } catch {
      throw new Error("the internal media delivery URL could not be created");
    }
  };
}
