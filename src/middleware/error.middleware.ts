import type { ErrorRequestHandler } from "express";
import type { ErrorResponse } from "../types/reservation.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
): void => {
  const invalidJson =
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed";
  const status: 400 | 500 = invalidJson ? 400 : 500;
  const body: ErrorResponse = invalidJson
    ? { code: "VALIDATION_ERROR", message: "Malformed JSON request body." }
    : { code: "INTERNAL_ERROR", message: "Internal server error" };
  response.status(status).json(body);
};
