import type { HealthResponse } from "../contracts/health.contract.js";

export function getHealthStatus(): HealthResponse {
  return {
    status: "ok",
    service: "campushub-backend",
    timestamp: new Date().toISOString(),
  };
}
