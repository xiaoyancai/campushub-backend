import type { RequestHandler, Response } from "express";
import {
  ReservationFailure,
  type ReservationService,
} from "../services/reservation.service.js";
import type {
  Reservation,
  Resource,
  ErrorResponse,
} from "../types/reservation.js";

type Params = Record<string, string>;
type Query = Record<string, unknown>;
type Handler<T> = RequestHandler<Params, T | ErrorResponse, unknown, Query>;
interface ReservationControllers {
  listResources: Handler<Resource[]>;
  createReservation: Handler<Reservation>;
  listUserReservations: Handler<Reservation[]>;
}
function fail(
  response: Response,
  status: 400 | 409,
  code: string,
  message: string,
): void {
  const body: ErrorResponse = { code, message };
  response.status(status).json(body);
}
function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function validDateTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match =
    /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(
      value,
    );
  if (!match) return false;
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDay = days[month - 1];
  return (
    maxDay !== undefined && day <= maxDay && Number.isFinite(Date.parse(value))
  );
}
export function createReservationControllers(
  service: ReservationService,
): ReservationControllers {
  return {
    listResources(request, response, next): void {
      const type = request.query.type;
      if (
        type !== undefined &&
        type !== "ROOM" &&
        type !== "EQUIPMENT" &&
        type !== "LAB"
      ) {
        fail(
          response,
          400,
          "VALIDATION_ERROR",
          "type must be ROOM, EQUIPMENT, or LAB when provided.",
        );
        return;
      }
      try {
        response.status(200).json(service.listResources(type));
      } catch (error: unknown) {
        next(error);
      }
    },
    createReservation(request, response, next): void {
      const body = request.body;
      if (
        !isRecord(body) ||
        Object.keys(body).some(
          (k) => !["resourceId", "userId", "startTime", "endTime"].includes(k),
        ) ||
        !nonempty(body.resourceId) ||
        !nonempty(body.userId) ||
        !validDateTime(body.startTime) ||
        !validDateTime(body.endTime)
      ) {
        fail(
          response,
          400,
          "VALIDATION_ERROR",
          "Provide resourceId, userId, startTime and endTime only, with non-empty IDs and valid ISO 8601 timestamps including a timezone.",
        );
        return;
      }
      if (Date.parse(body.endTime) <= Date.parse(body.startTime)) {
        fail(
          response,
          400,
          "VALIDATION_ERROR",
          "endTime must be after startTime.",
        );
        return;
      }
      try {
        response
          .status(201)
          .json(
            service.create({
              resourceId: body.resourceId,
              userId: body.userId,
              startTime: body.startTime,
              endTime: body.endTime,
            }),
          );
      } catch (error: unknown) {
        if (error instanceof ReservationFailure) {
          fail(
            response,
            error.code === "UNKNOWN_RESOURCE" ? 400 : 409,
            error.code,
            error.message,
          );
          return;
        }
        next(error);
      }
    },
    listUserReservations(request, response, next): void {
      const userId = request.params.userId;
      if (!nonempty(userId)) {
        fail(response, 400, "VALIDATION_ERROR", "userId must be non-empty.");
        return;
      }
      try {
        response.status(200).json(service.listForUser(userId));
      } catch (error: unknown) {
        next(error);
      }
    },
  };
}
