import type { RequestHandler, Response } from "express";
import {
  ReservationFailure,
  createReservationService,
  type ReservationService,
} from "../services/reservation.service.js";
import type { Reservation, ErrorResponse } from "../types/reservation.js";

type Params = Record<string, string>;
type Query = Record<string, unknown>;
type Handler<T> = RequestHandler<Params, T | ErrorResponse, unknown, Query>;
interface ReservationControllers {
  createReservation: Handler<Reservation>;
  listUserReservations: Handler<Reservation[]>;
  getReservation: Handler<Reservation>;
  cancelReservation: Handler<void>;
}
function fail(
  response: Response,
  status: 400 | 404 | 409,
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
  service: ReservationService = createReservationService(),
): ReservationControllers {
  return {
    async createReservation(request, response, next): Promise<void> {
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
      try {
        response.status(201).json(
          await service.create({
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
            error.code === "UNKNOWN_RESOURCE" ||
              error.code === "VALIDATION_ERROR"
              ? 400
              : 409,
            error.code,
            error.message,
          );
          return;
        }
        next(error);
      }
    },
    async cancelReservation(request, response, next): Promise<void> {
      try {
        const id = request.params.id;
        if (id === undefined || !(await service.cancel(id))) {
          fail(response, 404, "NOT_FOUND", "Reservation not found.");
          return;
        }
        response.status(204).end();
      } catch (error: unknown) {
        next(error);
      }
    },
    async getReservation(request, response, next): Promise<void> {
      try {
        const id = request.params.id;
        const reservation =
          id === undefined ? undefined : await service.getById(id);
        if (reservation === undefined) {
          fail(response, 404, "NOT_FOUND", "Reservation not found.");
          return;
        }
        response.status(200).json(reservation);
      } catch (error: unknown) {
        next(error);
      }
    },
    async listUserReservations(request, response, next): Promise<void> {
      const userId = request.params.userId;
      if (!nonempty(userId)) {
        fail(response, 400, "VALIDATION_ERROR", "userId must be non-empty.");
        return;
      }
      try {
        response.status(200).json(await service.listForUser(userId));
      } catch (error: unknown) {
        next(error);
      }
    },
  };
}
