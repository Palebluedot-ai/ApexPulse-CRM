export interface HealthResponse {
  ok: true;
  app: "hashkey-otc-crm-v1";
  checkedAt: string;
}

export function buildHealthResponse(now = new Date()): HealthResponse {
  return {
    ok: true,
    app: "hashkey-otc-crm-v1",
    checkedAt: now.toISOString(),
  };
}
