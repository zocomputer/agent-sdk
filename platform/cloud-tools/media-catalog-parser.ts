import type { GatewayMediaModel, MediaModelKind, MediaPricing, MediaResult } from "./media-contracts";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const scalarRecordArray = (value: unknown): readonly Readonly<Record<string, string | number | boolean>>[] | undefined =>
  Array.isArray(value) && value.every((row) => isRecord(row) && Object.values(row).every((v) => ["string", "number", "boolean"].includes(typeof v)))
    ? value as readonly Readonly<Record<string, string | number | boolean>>[] : undefined;

function parsePricing(value: unknown): MediaPricing | null | "invalid" {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) return "invalid";
  const string = (key: string) => typeof value[key] === "string" ? value[key] : undefined;
  const imageDimensions = scalarRecordArray(value.image_dimension_quality_pricing);
  const videoDuration = scalarRecordArray(value.video_duration_pricing);
  const input = string("input"); const output = string("output"); const image = string("image");
  const speech = string("speech_input_character_cost"); const transcription = string("transcription_duration_cost_per_second");
  return {
    ...(input ? { inputPerTokenUsd: input } : {}),
    ...(output ? { outputPerTokenUsd: output } : {}),
    ...(image ? { imagePerOutputUsd: image } : {}),
    ...(imageDimensions ? { imageDimensions } : {}),
    ...(speech ? { speechPerCharacterUsd: speech } : {}),
    ...(transcription ? { transcriptionPerSecondUsd: transcription } : {}),
    ...(videoDuration ? { videoDuration } : {}),
  };
}

export function parseMediaCatalog(raw: unknown): MediaResult<readonly GatewayMediaModel[], string> {
  const rows = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.data) ? raw.data : null;
  if (rows === null) return { ok: false, error: "Catalog envelope must contain a data array" };
  const models: GatewayMediaModel[] = [];
  for (const row of rows) {
    if (!isRecord(row) || !isMediaKind(row.type)) continue;
    const pricing = parsePricing(row.pricing);
    if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.description !== "string" || pricing === "invalid") {
      return { ok: false, error: `Malformed media catalog row${typeof row.id === "string" ? ` ${row.id}` : ""}` };
    }
    const capabilitiesKey = `${row.type}_capabilities`;
    const capabilities = isRecord(row[capabilitiesKey]) ? row[capabilitiesKey] : null;
    const operations = capabilities && Array.isArray(capabilities.supported_operations)
      ? capabilities.supported_operations.filter((v): v is string => typeof v === "string") : [];
    models.push({ id: row.id, name: row.name, description: row.description, kind: row.type, pricing, reportedOperations: operations, rawCapabilities: capabilities });
  }
  return models.length === 0 ? { ok: false, error: "Catalog contains no valid media models" } : { ok: true, value: models };
}

function isMediaKind(value: unknown): value is MediaModelKind {
  return value === "image" || value === "video" || value === "speech" || value === "transcription";
}
