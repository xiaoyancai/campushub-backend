import type { Request, Response } from "express";

import type { HealthResponse } from "../contracts/health.contract.js";
import { getHealthStatus } from "../services/health.service.js";

export function getHealth(
  _request: Request,
  response: Response<HealthResponse>,
): void {
  response.status(200).json(getHealthStatus());
}
