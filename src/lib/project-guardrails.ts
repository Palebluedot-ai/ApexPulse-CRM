export function getProjectGuardrails() {
  return {
    primaryObject: "person",
    primaryChannel: "pwa",
    extractionMode: "review-first",
    evidencePolicy: "retain-original",
    deploymentBias: "local-first",
    coreLoop: ["capture", "review", "timeline", "followup-state", "tasks"],
  };
}
