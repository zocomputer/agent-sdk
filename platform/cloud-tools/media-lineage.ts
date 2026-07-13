import type { MediaInvocationLineage } from "./media-contracts";
import type { SearchInvocationLineage } from "./search-contracts";

export const ZO_MEDIA_LINEAGE_HEADER = "x-zo-media-lineage";
export const MAX_MEDIA_LINEAGE_HEADER_LENGTH = 1024;

/** Every paid-tool lineage rides the same bounded header; the api parser accepts both vocabularies. */
export type InvocationLineage = MediaInvocationLineage | SearchInvocationLineage;

/** Serialize the bounded, secret-free usage lineage sent only to Zo's proxy. */
export function serializeMediaInvocationLineage(lineage: InvocationLineage): string {
  const value = JSON.stringify(lineage);
  if (value.length > MAX_MEDIA_LINEAGE_HEADER_LENGTH) {
    throw new Error("media invocation lineage exceeds the internal header limit");
  }
  return value;
}

export function mediaInvocationHeaders(lineage: InvocationLineage): Readonly<Record<string, string>> {
  return { [ZO_MEDIA_LINEAGE_HEADER]: serializeMediaInvocationLineage(lineage) };
}
