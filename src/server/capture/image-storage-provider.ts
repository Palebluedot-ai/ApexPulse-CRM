import { readFile } from "node:fs/promises";
import {
  buildLocalImageStoragePlan,
  localAttachmentPath,
  writeLocalAttachment as defaultWriteLocalAttachment,
  type LocalImageStorageInput,
  type LocalImageStoragePlan,
} from "./local-image-storage";

type EnvLike = Record<string, string | undefined>;
type FetchLike = typeof fetch;

export interface ImageEvidenceInput extends LocalImageStorageInput {
  bytes: Buffer;
}

interface StorageProviderOptions {
  env?: EnvLike;
  fetch?: FetchLike;
  writeLocalAttachment?: (
    storageKey: string,
    bytes: Buffer,
  ) => Promise<void> | void;
}

interface ReadStorageOptions {
  env?: EnvLike;
  fetch?: FetchLike;
}

interface SupabaseStorageConfig {
  url: string;
  serviceRoleKey: string;
  bucket: string;
}

export async function saveImageEvidence(
  input: ImageEvidenceInput,
  options: StorageProviderOptions = {},
): Promise<LocalImageStoragePlan> {
  const provider = resolveStorageProvider(options.env);

  if (provider === "local") {
    const plan = buildLocalImageStoragePlan(input);
    await (options.writeLocalAttachment ?? defaultWriteLocalAttachment)(
      plan.storageKey,
      input.bytes,
    );

    return plan;
  }

  const plan = buildSupabaseImageStoragePlan(input);
  await uploadSupabaseObject({
    plan,
    bytes: input.bytes,
    config: readSupabaseStorageConfig(options.env),
    fetch: options.fetch ?? fetch,
  });

  return plan;
}

export async function readImageEvidence(
  storageKey: string,
  options: ReadStorageOptions = {},
): Promise<Buffer> {
  if (storageKey.startsWith("local-images/")) {
    return readFile(localAttachmentPath(storageKey));
  }

  if (!storageKey.startsWith("supabase-images/")) {
    throw new Error("Unsupported attachment storage key");
  }

  const response = await (options.fetch ?? fetch)(
    supabaseObjectUrl(readSupabaseStorageConfig(options.env), storageKey),
    {
      method: "GET",
      headers: supabaseAuthHeaders(readSupabaseStorageConfig(options.env)),
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase Storage download failed: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function resolveStorageProvider(env: EnvLike = process.env): "local" | "supabase" {
  const provider = env.STORAGE_PROVIDER?.trim().toLowerCase() || "local";

  if (provider === "local" || provider === "supabase") return provider;

  throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
}

function buildSupabaseImageStoragePlan(
  input: LocalImageStorageInput,
): LocalImageStoragePlan {
  const localPlan = buildLocalImageStoragePlan(input);

  return {
    ...localPlan,
    storageKey: localPlan.storageKey.replace(
      /^local-images\//u,
      "supabase-images/",
    ),
  };
}

function readSupabaseStorageConfig(
  env: EnvLike = process.env,
): SupabaseStorageConfig {
  const url = env.SUPABASE_URL?.trim().replace(/\/+$/u, "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = env.SUPABASE_STORAGE_BUCKET?.trim();

  if (!url) throw new Error("SUPABASE_URL is required");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  if (!bucket) throw new Error("SUPABASE_STORAGE_BUCKET is required");

  return { url, serviceRoleKey, bucket };
}

async function uploadSupabaseObject(input: {
  plan: LocalImageStoragePlan;
  bytes: Buffer;
  config: SupabaseStorageConfig;
  fetch: FetchLike;
}): Promise<void> {
  const response = await input.fetch(
    supabaseObjectUrl(input.config, input.plan.storageKey),
    {
      method: "POST",
      headers: {
        ...supabaseAuthHeaders(input.config),
        "Cache-Control": "3600",
        "Content-Type": input.plan.mimeType,
        "x-upsert": "false",
      },
      body: new Uint8Array(input.bytes),
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase Storage upload failed: ${response.status}`);
  }
}

function supabaseAuthHeaders(config: SupabaseStorageConfig) {
  return {
    Authorization: `Bearer ${config.serviceRoleKey}`,
    apikey: config.serviceRoleKey,
  };
}

function supabaseObjectUrl(
  config: SupabaseStorageConfig,
  storageKey: string,
): string {
  const encodedBucket = encodeURIComponent(config.bucket);
  const encodedKey = storageKey.split("/").map(encodeURIComponent).join("/");

  return `${config.url}/storage/v1/object/${encodedBucket}/${encodedKey}`;
}
