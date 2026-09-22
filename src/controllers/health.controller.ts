import type { NextFunction, Request, Response } from "express";

import type { HealthResponse } from "../contracts/health.contract.js";
import { getHealthStatus } from "../services/health.service.js";

export function getHealth(
  _request: Request,
  response: Response<HealthResponse>,
  next: NextFunction,
): void {
  try {
    response.status(200).json(getHealthStatus());
  } catch (error: unknown) {
    next(error);
  }
}
