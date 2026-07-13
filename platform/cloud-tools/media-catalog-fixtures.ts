// Recorded from the public Vercel AI Gateway catalog on 2026-07-12. Parser
// tests consume these as untrusted input; runtime discovery never imports them.
export const MEDIA_CATALOG_FIXTURES: readonly unknown[] = [
  {
    id: "bfl/flux-kontext-pro",
    object: "model",
    owned_by: "bfl",
    name: "FLUX.1 Kontext Pro",
    description: "FLUX.1 Kontext supports image generation and prompt-based editing.",
    type: "image",
    tags: ["image-generation"],
    pricing: { image: "0.04" },
  },
  {
    id: "xai/grok-imagine-video",
    object: "model",
    owned_by: "xai",
    name: "Grok Imagine",
    description: "Video generation from text, images, references, or an existing video.",
    type: "video",
    video_capabilities: {
      supported_operations: [
        "text-to-video",
        "image-to-video",
        "reference-to-video",
        "video-editing",
        "extend-video",
      ],
      supported_resolutions: ["480p", "720p"],
      supported_aspect_ratios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
      supported_durations_seconds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      generate_audio: false,
      supported_fps: [24],
      input_limits: {
        image: {
          max_count: 5,
          supported_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
          supported_sources: ["url", "base64", "buffer"],
        },
        video: {
          max_count: 1,
          supported_sources: ["url"],
          min_duration_seconds: 2,
          max_duration_seconds: 8.7,
        },
      },
    },
    pricing: {
      video_duration_pricing: [
        { resolution: "480p", cost_per_second: "0.05" },
        { resolution: "720p", cost_per_second: "0.07" },
      ],
    },
  },
  {
    id: "openai/tts-1",
    object: "model",
    owned_by: "openai",
    name: "TTS-1",
    description: "Converts text to natural sounding speech.",
    type: "speech",
    pricing: {
      input: "0.000015",
      speech_input_character_cost: "0.000015",
    },
  },
  {
    id: "recraft/recraft-v4",
    object: "model",
    owned_by: "recraft",
    name: "Recraft V4",
    description: "Image generation with photorealistic and illustration styles.",
    type: "image",
    tags: ["image-generation"],
    pricing: {
      image: "0.04",
      image_dimension_quality_pricing: [{ style: "vector_illustration", cost: "0.08" }],
    },
  },
  {
    id: "openai/whisper-1",
    object: "model",
    owned_by: "openai",
    name: "Whisper",
    description: "Multilingual speech recognition, translation, and language identification.",
    type: "transcription",
    pricing: {
      input: "0.0000000001",
      transcription_duration_cost_per_second: "0.0001",
    },
  },
] as const;

export const MALFORMED_MEDIA_CATALOG_FIXTURES: readonly unknown[] = [
  null,
  { data: "not-an-array" },
  { data: [{ id: "missing/type", name: "Missing type" }] },
  { data: [{ id: "bad/pricing", name: "Bad pricing", type: "speech", pricing: [] }] },
] as const;
