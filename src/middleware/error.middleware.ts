import type { ErrorRequestHandler } from "express";

import type { ErrorResponse } from "../contracts/health.contract.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
): void => {
  console.error("Unhandled request error", error);

  const body: ErrorResponse = {
    status: "error",
    message: "Internal server error",
  };

  response.status(500).json(body);
};
