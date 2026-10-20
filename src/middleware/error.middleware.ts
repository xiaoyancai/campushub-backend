import type { ErrorRequestHandler } from "express";
import type { ErrorResponse } from "../types/reservation.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
): void => {
  let status: 400 | 413 | 415 | 500 = 500;
  let body: ErrorResponse = {
    code: "INTERNAL_ERROR",
    message: "Internal server error",
  };

  // Match known parser/router errors; never copy an arbitrary error's status or message.
  if (error instanceof Error && "status" in error) {
    if (error instanceof URIError && error.status === 400) {
      status = 400;
      body = {
        code: "VALIDATION_ERROR",
        message: "Invalid URL parameter encoding.",
      };
    } else if ("type" in error) {
      if (error.type === "entity.parse.failed" && error.status === 400) {
        status = 400;
        body = {
          code: "VALIDATION_ERROR",
          message: "Malformed JSON request body.",
        };
      } else if (error.type === "entity.too.large" && error.status === 413) {
        status = 413;
        body = {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request body is too large.",
        };
      } else if (error.type === "charset.unsupported" && error.status === 415) {
        status = 415;
        body = {
          code: "UNSUPPORTED_CHARSET",
          message: "Unsupported request charset.",
        };
      }
    }
  }
  response.status(status).json(body);
};
