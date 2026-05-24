import { describe, expect, it } from "vitest";
import { getProjectGuardrails } from "./project-guardrails";

describe("project guardrails", () => {
  it("keeps the first version focused on the agreed CRM loop", () => {
    expect(getProjectGuardrails()).toEqual({
      primaryObject: "person",
      primaryChannel: "pwa",
      extractionMode: "review-first",
      evidencePolicy: "retain-original",
      deploymentBias: "local-first",
      coreLoop: [
        "capture",
        "review",
        "timeline",
        "followup-state",
        "tasks",
      ],
    });
  });
});
