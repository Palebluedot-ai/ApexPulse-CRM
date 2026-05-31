import { describe, expect, it, vi } from "vitest";
import {
  readImageEvidence,
  saveImageEvidence,
} from "./image-storage-provider";

describe("image storage provider", () => {
  it("stores local images through the local writer", async () => {
    const writeLocalAttachment = vi.fn();

    const result = await saveImageEvidence(
      {
        fileName: "wechat.png",
        mimeType: "image/png",
        fileSize: 4,
        bytes: Buffer.from("demo"),
        uploadedAt: new Date("2026-05-31T08:00:00Z"),
        uniqueId: "local-id",
      },
      {
        env: { STORAGE_PROVIDER: "local" },
        writeLocalAttachment,
      },
    );

    expect(result.storageKey).toBe(
      "local-images/2026/05/31/20260531T080000000Z-local-id-wechat.png",
    );
    expect(writeLocalAttachment).toHaveBeenCalledWith(
      result.storageKey,
      Buffer.from("demo"),
    );
  });

  it("uploads cloud images to Supabase Storage without exposing secrets", async () => {
    const fetchCalls: Array<[string, RequestInit | undefined]> = [];
    const fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push([String(url), init]);
      return new Response("{}", { status: 200 });
    });

    const result = await saveImageEvidence(
      {
        fileName: "wechat.png",
        mimeType: "image/png",
        fileSize: 4,
        bytes: Buffer.from("demo"),
        uploadedAt: new Date("2026-05-31T08:00:00Z"),
        uniqueId: "cloud-id",
      },
      {
        env: {
          STORAGE_PROVIDER: "supabase",
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
          SUPABASE_STORAGE_BUCKET: "otc-crm-attachments",
        },
        fetch,
      },
    );

    expect(result.storageKey).toBe(
      "supabase-images/2026/05/31/20260531T080000000Z-cloud-id-wechat.png",
    );
    expect(fetchCalls[0]).toEqual([
      "https://project.supabase.co/storage/v1/object/otc-crm-attachments/supabase-images/2026/05/31/20260531T080000000Z-cloud-id-wechat.png",
      expect.objectContaining({
        method: "POST",
        body: new Uint8Array(Buffer.from("demo")),
      }),
    ]);

    const [, init] = fetchCalls[0] ?? [];
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer service-role-secret",
      apikey: "service-role-secret",
      "Content-Type": "image/png",
      "x-upsert": "false",
    });
    expect(JSON.stringify(result)).not.toContain("service-role-secret");
  });

  it("reports missing Supabase settings before upload", async () => {
    await expect(
      saveImageEvidence(
        {
          fileName: "wechat.png",
          mimeType: "image/png",
          fileSize: 4,
          bytes: Buffer.from("demo"),
        },
        {
          env: { STORAGE_PROVIDER: "supabase" },
          fetch: vi.fn(),
        },
      ),
    ).rejects.toThrow("SUPABASE_URL is required");
  });

  it("downloads Supabase evidence through the server provider", async () => {
    const fetch = vi.fn(
      async () => new Response("image-bytes", { status: 200 }),
    );

    const bytes = await readImageEvidence(
      "supabase-images/2026/05/31/demo.png",
      {
        env: {
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
          SUPABASE_STORAGE_BUCKET: "otc-crm-attachments",
        },
        fetch,
      },
    );

    expect(Buffer.from(bytes).toString("utf8")).toBe("image-bytes");
    expect(fetch).toHaveBeenCalledWith(
      "https://project.supabase.co/storage/v1/object/otc-crm-attachments/supabase-images/2026/05/31/demo.png",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
