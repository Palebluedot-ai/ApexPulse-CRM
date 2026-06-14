import { describe, expect, it } from "vitest";
import { buildDemoSeedData } from "./seed";

describe("demo seed data", () => {
  it("creates one coherent customer follow-up fixture", () => {
    const seed = buildDemoSeedData();

    expect(seed.user.email).toBe("chao.local@example.com");
    expect(seed.party.displayName).toBe("刘总");
    expect(seed.event.reviewStatus).toBe("confirmed");
    expect(seed.event.contentType).toBe("image");
    expect(seed.attachment.mimeType).toBe("image/png");
    expect(seed.task.status).toBe("open");
  });

  it("keeps the latest communication card fields tied to the seeded event", () => {
    const seed = buildDemoSeedData();

    expect(seed.party.lastContactSummary).toBe(seed.event.aiSummary);
    expect(seed.party.followupStatus).toBe("due_soon");
    expect(seed.task.description).toContain("刘总");
  });

  it("includes passwordHash null by default and accepts an override", () => {
    const defaulted = buildDemoSeedData();
    expect(defaulted.user.passwordHash).toBeNull();

    const withHash = buildDemoSeedData({ passwordHash: "scrypt$1$a$b" });
    expect(withHash.user.passwordHash).toBe("scrypt$1$a$b");
  });
});
