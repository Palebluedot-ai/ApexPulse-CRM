import { describe, expect, it } from "vitest";
import { checkDeploymentEnv, parseDotEnvContent } from "./deployment-env";

describe("deployment env checklist", () => {
  it("keeps local development focused on database and local login", () => {
    const result = checkDeploymentEnv(
      {
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/hashkey",
        LOCAL_AUTH_EMAIL: "chao.local@example.com",
        LOCAL_AUTH_PASSWORD: "local-dev-password",
        AUTH_SESSION_SECRET: "local-secret",
      },
      "local",
    );

    expect(result.missingRequiredKeys).toEqual([]);
    expect(result.warningMessages).toEqual([]);
  });

  it("requires cloud storage and secure auth settings for staging", () => {
    const result = checkDeploymentEnv(
      {
        DATABASE_URL: "postgres://postgres:postgres@example.supabase.co:5432/postgres",
        LOCAL_AUTH_EMAIL: "chao@example.com",
        LOCAL_AUTH_PASSWORD: "secret-password",
        AUTH_SESSION_SECRET: "cloud-secret",
        VISION_API_KEY: "vision-key",
        VISION_API_BASE_URL: "https://api.example.com/v1",
        VISION_API_MODEL: "vision-model",
        APP_BASE_URL: "https://crm.example.com",
      },
      "staging",
    );

    expect(result.missingRequiredKeys).toEqual([
      "STORAGE_PROVIDER",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_STORAGE_BUCKET",
    ]);
    expect(result.warningMessages).toEqual([
      "AUTH_STRICT_ENV should be true for staging",
      "AUTH_COOKIE_SECURE should be true for staging",
    ]);
  });

  it("does not expose secret values in the report", () => {
    const result = checkDeploymentEnv(
      {
        DATABASE_URL: "postgres://secret-user:secret-pass@example.supabase.co:5432/postgres",
        LOCAL_AUTH_EMAIL: "chao@example.com",
        LOCAL_AUTH_PASSWORD: "secret-password",
        AUTH_SESSION_SECRET: "cloud-secret",
        AUTH_STRICT_ENV: "true",
        AUTH_COOKIE_SECURE: "true",
        STORAGE_PROVIDER: "supabase",
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
        SUPABASE_STORAGE_BUCKET: "attachments",
        VISION_API_KEY: "vision-key",
        VISION_API_BASE_URL: "https://api.example.com/v1",
        VISION_API_MODEL: "vision-model",
        APP_BASE_URL: "https://crm.example.com",
      },
      "production",
    );

    const serialized = JSON.stringify(result);

    expect(result.missingRequiredKeys).toEqual([]);
    expect(result.warningMessages).toEqual([]);
    expect(serialized).not.toContain("secret-pass");
    expect(serialized).not.toContain("service-role-secret");
    expect(serialized).not.toContain("vision-key");
  });

  it("parses dotenv files without treating comments as keys", () => {
    expect(
      parseDotEnvContent(`
# local notes
DATABASE_URL=postgres://localhost/hashkey
AUTH_COOKIE_SECURE=false
QUOTED_VALUE="hello world"
EMPTY_VALUE=
      `),
    ).toEqual({
      DATABASE_URL: "postgres://localhost/hashkey",
      AUTH_COOKIE_SECURE: "false",
      QUOTED_VALUE: "hello world",
      EMPTY_VALUE: "",
    });
  });
});
