import { describe, expect, it } from "vitest";
import { buildHealthResponse } from "./health";

describe("health response", () => {
  it("returns a stable public health payload without secrets", () => {
    expect(
      buildHealthResponse(new Date("2026-05-31T10:00:00Z")),
    ).toEqual({
      ok: true,
      app: "apexpulse-crm",
      checkedAt: "2026-05-31T10:00:00.000Z",
    });
  });
});
