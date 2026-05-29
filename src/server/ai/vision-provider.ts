import {
  buildVisionExtractionRequest,
  extractProviderText,
  parseVisionExtractionText,
  type VisionExtractionResult,
} from "./vision-extraction";

export interface VisionProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ExtractImageInput {
  config: VisionProviderConfig;
  imageBytes: Buffer;
  mimeType: string;
  note?: string | null;
  fetchImpl?: typeof fetch;
}

type VisionProviderEnv = Record<string, string | undefined>;

function envString(
  env: VisionProviderEnv,
  key: "VISION_API_KEY" | "VISION_API_BASE_URL" | "VISION_API_MODEL",
): string {
  return typeof env[key] === "string" ? env[key].trim() : "";
}

export function buildVisionProviderConfig(
  env: VisionProviderEnv = process.env,
): VisionProviderConfig {
  const apiKey = envString(env, "VISION_API_KEY");
  const baseUrl = envString(env, "VISION_API_BASE_URL");
  const model = envString(env, "VISION_API_MODEL");

  if (!apiKey) throw new Error("VISION_API_KEY is required");
  if (!baseUrl) throw new Error("VISION_API_BASE_URL is required");
  if (!model) throw new Error("VISION_API_MODEL is required");

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/g, ""),
    model,
  };
}

export async function extractImageWithVisionProvider(
  input: ExtractImageInput,
): Promise<VisionExtractionResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    `${input.config.baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildVisionExtractionRequest({
          model: input.config.model,
          imageBytes: input.imageBytes,
          mimeType: input.mimeType,
          note: input.note,
        }),
      ),
    },
  );

  if (!response.ok) {
    throw new Error(`Vision provider request failed: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  return parseVisionExtractionText(extractProviderText(payload));
}
