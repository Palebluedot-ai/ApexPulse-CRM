import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  buildVisionExtractionFields,
  buildVisionExtractionPrompt,
  parseVisionExtractionText,
} from "../src/server/ai/vision-extraction";

interface EnvConfig {
  VISION_API_KEY?: string;
  VISION_API_BASE_URL?: string;
  VISION_API_MODEL?: string;
}

function parseDotEnv(text: string): EnvConfig {
  const env: EnvConfig = {};

  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator) as keyof EnvConfig;
    env[key] = trimmed.slice(separator + 1);
  }

  return env;
}

function requireEnv(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

function mimeTypeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

async function main() {
  const imagePaths = process.argv.slice(2);
  if (imagePaths.length === 0) {
    throw new Error("At least one image path is required");
  }

  const env = parseDotEnv(await readFile(".env.local", "utf8"));
  const apiKey = requireEnv(env.VISION_API_KEY, "VISION_API_KEY");
  const baseUrl = requireEnv(
    env.VISION_API_BASE_URL,
    "VISION_API_BASE_URL",
  ).replace(/\/+$/g, "");
  const model = requireEnv(env.VISION_API_MODEL, "VISION_API_MODEL");
  const prompt = buildVisionExtractionPrompt();

  const results = [];

  for (const imagePath of imagePaths) {
    const imageBytes = await readFile(imagePath);
    const body = {
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeTypeFromPath(imagePath)};base64,${imageBytes.toString(
                  "base64",
                )}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    };
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();

    if (!response.ok) {
      results.push({
        file: basename(imagePath),
        status: response.status,
        error: text.slice(0, 600),
      });
      continue;
    }

    const payload = JSON.parse(text) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "{}";

    try {
      const parsed = parseVisionExtractionText(content);

      results.push({
        file: basename(imagePath),
        status: response.status,
        result: parsed,
        extractedFields: buildVisionExtractionFields(parsed),
      });
    } catch {
      results.push({
        file: basename(imagePath),
        status: response.status,
        raw: content.slice(0, 600),
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
