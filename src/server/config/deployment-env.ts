export type DeploymentTarget = "local" | "staging" | "production";

type EnvLike = Record<string, string | undefined>;

type EnvKey =
  | "APP_BASE_URL"
  | "AUTH_COOKIE_SECURE"
  | "AUTH_SESSION_SECRET"
  | "AUTH_STRICT_ENV"
  | "DATABASE_URL"
  | "LOCAL_AUTH_EMAIL"
  | "LOCAL_AUTH_PASSWORD"
  | "STORAGE_PROVIDER"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "SUPABASE_STORAGE_BUCKET"
  | "SUPABASE_URL"
  | "VISION_API_BASE_URL"
  | "VISION_API_KEY"
  | "VISION_API_MODEL"
  | "VISION_API_PROVIDER";

export interface DeploymentEnvSpec {
  key: EnvKey;
  requiredIn: DeploymentTarget[];
  secret: boolean;
  description: string;
}

export interface DeploymentEnvReport {
  target: DeploymentTarget;
  configuredKeys: EnvKey[];
  missingRequiredKeys: EnvKey[];
  warningMessages: string[];
}

const localRequired: DeploymentTarget[] = ["local", "staging", "production"];
const cloudRequired: DeploymentTarget[] = ["staging", "production"];

export const deploymentEnvSpecs: DeploymentEnvSpec[] = [
  {
    key: "DATABASE_URL",
    requiredIn: localRequired,
    secret: true,
    description: "Postgres connection string.",
  },
  {
    key: "LOCAL_AUTH_EMAIL",
    requiredIn: localRequired,
    secret: false,
    description: "First local-account login email.",
  },
  {
    key: "LOCAL_AUTH_PASSWORD",
    requiredIn: localRequired,
    secret: true,
    description: "First local-account login password.",
  },
  {
    key: "AUTH_SESSION_SECRET",
    requiredIn: localRequired,
    secret: true,
    description: "HMAC secret used to sign login cookies.",
  },
  {
    key: "AUTH_STRICT_ENV",
    requiredIn: [],
    secret: false,
    description: "Set to true outside local development to reject missing auth env.",
  },
  {
    key: "AUTH_COOKIE_SECURE",
    requiredIn: [],
    secret: false,
    description: "Set to true when the app is served over HTTPS.",
  },
  {
    key: "STORAGE_PROVIDER",
    requiredIn: cloudRequired,
    secret: false,
    description: "Attachment storage backend. Cloud staging uses supabase.",
  },
  {
    key: "SUPABASE_URL",
    requiredIn: cloudRequired,
    secret: false,
    description: "Supabase project URL for cloud attachment storage.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    requiredIn: cloudRequired,
    secret: true,
    description: "Server-only Supabase key used for private storage writes.",
  },
  {
    key: "SUPABASE_STORAGE_BUCKET",
    requiredIn: cloudRequired,
    secret: false,
    description: "Supabase Storage bucket for uploaded evidence images.",
  },
  {
    key: "VISION_API_PROVIDER",
    requiredIn: [],
    secret: false,
    description: "Reserved provider label for future multi-provider routing.",
  },
  {
    key: "VISION_API_KEY",
    requiredIn: cloudRequired,
    secret: true,
    description: "External vision model API key.",
  },
  {
    key: "VISION_API_BASE_URL",
    requiredIn: cloudRequired,
    secret: false,
    description: "OpenAI-compatible chat completions base URL.",
  },
  {
    key: "VISION_API_MODEL",
    requiredIn: cloudRequired,
    secret: false,
    description: "Vision-capable model name.",
  },
  {
    key: "APP_BASE_URL",
    requiredIn: cloudRequired,
    secret: false,
    description: "Public HTTPS app URL used for staging or production checks.",
  },
];

function hasValue(env: EnvLike, key: EnvKey): boolean {
  return Boolean(env[key]?.trim());
}

function configuredKeys(env: EnvLike): EnvKey[] {
  return deploymentEnvSpecs
    .map((spec) => spec.key)
    .filter((key) => hasValue(env, key));
}

function missingRequiredKeys(env: EnvLike, target: DeploymentTarget): EnvKey[] {
  return deploymentEnvSpecs
    .filter((spec) => spec.requiredIn.includes(target))
    .map((spec) => spec.key)
    .filter((key) => !hasValue(env, key));
}

function cloudWarnings(env: EnvLike, target: DeploymentTarget): string[] {
  if (target === "local") return [];

  const warnings: string[] = [];

  if (env.AUTH_STRICT_ENV !== "true") {
    warnings.push(`AUTH_STRICT_ENV should be true for ${target}`);
  }

  if (env.AUTH_COOKIE_SECURE !== "true") {
    warnings.push(`AUTH_COOKIE_SECURE should be true for ${target}`);
  }

  return warnings;
}

export function checkDeploymentEnv(
  env: EnvLike,
  target: DeploymentTarget,
): DeploymentEnvReport {
  return {
    target,
    configuredKeys: configuredKeys(env),
    missingRequiredKeys: missingRequiredKeys(env, target),
    warningMessages: cloudWarnings(env, target),
  };
}

export function parseDotEnvContent(content: string): EnvLike {
  const env: EnvLike = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    const rawValue = line.slice(equalsIndex + 1).trim();
    const value =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;

    env[key] = value;
  }

  return env;
}
