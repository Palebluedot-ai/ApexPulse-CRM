export interface HealthResponse {
  ok: true;
  app: "apexpulse-crm";
  checkedAt: string;
}

export function buildHealthResponse(now = new Date()): HealthResponse {
  return {
    ok: true,
    app: "apexpulse-crm",
    checkedAt: now.toISOString(),
  };
}
