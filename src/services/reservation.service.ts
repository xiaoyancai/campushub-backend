import { randomUUID } from "node:crypto";
import type {
  CreateReservationRequest,
  Reservation,
  Resource,
  ResourceType,
} from "../types/reservation.js";

export class ReservationFailure extends Error {
  constructor(
    public readonly code:
      "UNKNOWN_RESOURCE" | "RESOURCE_UNAVAILABLE" | "DOUBLE_BOOKING",
    message: string,
  ) {
    super(message);
  }
}
export interface ReservationService {
  listResources(type?: ResourceType): Resource[];
  create(input: CreateReservationRequest): Reservation;
  listForUser(userId: string): Reservation[];
  getById(id: string): Reservation | undefined;
  cancel(id: string): boolean;
}
export function createReservationService(): ReservationService {
  const resources: Resource[] = [
    {
      id: "res-101",
      name: "Study Room 302",
      type: "ROOM",
      location: "Library, Floor 3",
      isAvailable: true,
    },
    {
      id: "res-102",
      name: "3D Printer A",
      type: "EQUIPMENT",
      location: "Maker Space",
      isAvailable: true,
    },
    {
      id: "res-103",
      name: "Computer Lab",
      type: "LAB",
      location: "Science Building",
      isAvailable: true,
    },
    {
      id: "res-104",
      name: "Study Room 304",
      type: "ROOM",
      location: "Library, Floor 3",
      isAvailable: false,
    },
  ];
  const reservations: Reservation[] = [];
  return {
    listResources(type?: ResourceType): Resource[] {
      return resources
        .filter((r) => type === undefined || r.type === type)
        .map((r) => ({ ...r }));
    },
    create(input: CreateReservationRequest): Reservation {
      const resource = resources.find((r) => r.id === input.resourceId);
      if (!resource)
        throw new ReservationFailure("UNKNOWN_RESOURCE", "Unknown resourceId.");
      if (!resource.isAvailable)
        throw new ReservationFailure(
          "RESOURCE_UNAVAILABLE",
          "Resource is currently unavailable.",
        );
      const start = Date.parse(input.startTime),
        end = Date.parse(input.endTime);
      // Synchronous check-and-insert for this single-process in-memory lab.
      if (
        reservations.some(
          (r) =>
            r.resourceId === input.resourceId &&
            r.status !== "CANCELLED" &&
            start < Date.parse(r.endTime) &&
            end > Date.parse(r.startTime),
        )
      ) {
        throw new ReservationFailure(
          "DOUBLE_BOOKING",
          "Resource is already reserved for this time slot.",
        );
      }
      const reservation: Reservation = {
        ...input,
        id: randomUUID(),
        status: "CONFIRMED",
      };
      reservations.push(reservation);
      return { ...reservation };
    },
    cancel(id: string): boolean {
      const reservation = reservations.find((r) => r.id === id);
      if (!reservation) return false;
      reservation.status = "CANCELLED";
      return true;
    },
    getById(id: string): Reservation | undefined {
      const reservation = reservations.find((r) => r.id === id);
      return reservation ? { ...reservation } : undefined;
    },
    listForUser(userId: string): Reservation[] {
      return reservations
        .filter((r) => r.userId === userId && r.status !== "CANCELLED")
        .map((r) => ({ ...r }));
    },
  };
}
