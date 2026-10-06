import { randomUUID } from "node:crypto";
import {
  ResourceModel,
  type ResourceRecord,
} from "../models/Resource.model.js";
import {
  ReservationModel,
  type ReservationRecord,
} from "../models/Reservation.model.js";
import type {
  CreateReservationRequest,
  Reservation,
} from "../types/reservation.js";

export class ReservationFailure extends Error {
  constructor(
    public readonly code:
      | "UNKNOWN_RESOURCE"
      | "RESOURCE_UNAVAILABLE"
      | "DOUBLE_BOOKING"
      | "VALIDATION_ERROR",
    message: string,
  ) {
    super(message);
  }
}
export interface ReservationService {
  create(input: CreateReservationRequest): Promise<Reservation>;
  listForUser(userId: string): Promise<Reservation[]>;
  getById(id: string): Promise<Reservation | undefined>;
  cancel(id: string): Promise<boolean>;
}
type PopulatedReservation = Omit<ReservationRecord, "resourceId"> & {
  resourceId: ResourceRecord | null;
};
function toResponse(record: PopulatedReservation): Reservation {
  if (!record.resourceId) throw new Error("Reservation resource is missing");
  return {
    id: record.publicId,
    resourceId: record.resourceId.publicId,
    userId: record.userId,
    startTime: record.startTime.toISOString(),
    endTime: record.endTime.toISOString(),
    status: record.status,
  };
}
export function createReservationService(): ReservationService {
  return {
    async create(input: CreateReservationRequest): Promise<Reservation> {
      const startTime = new Date(input.startTime),
        endTime = new Date(input.endTime);
      if (
        !Number.isFinite(startTime.getTime()) ||
        !Number.isFinite(endTime.getTime()) ||
        endTime <= startTime
      ) {
        throw new ReservationFailure(
          "VALIDATION_ERROR",
          "endTime must be after startTime.",
        );
      }

      return ResourceModel.db.transaction(
        async (session): Promise<Reservation> => {
          const resource = await ResourceModel.findOneAndUpdate(
            { publicId: input.resourceId },
            { $inc: { bookingVersion: 1 } },
            { returnDocument: "after", session },
          );
          if (!resource)
            throw new ReservationFailure(
              "UNKNOWN_RESOURCE",
              "Unknown resourceId.",
            );
          if (!resource.isAvailable)
            throw new ReservationFailure(
              "RESOURCE_UNAVAILABLE",
              "Resource is currently unavailable.",
            );
          const overlap = await ReservationModel.exists({
            resourceId: resource._id,
            status: { $in: ["PENDING", "CONFIRMED"] },
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
          }).session(session);
          if (overlap)
            throw new ReservationFailure(
              "DOUBLE_BOOKING",
              "Resource is already reserved for this time slot.",
            );
          const record = new ReservationModel({
            publicId: randomUUID(),
            resourceId: resource._id,
            userId: input.userId,
            startTime,
            endTime,
            status: "CONFIRMED",
          });
          await record.save({ session });
          return toResponse({
            ...record.toObject(),
            resourceId: resource.toObject(),
          });
        },
      );
    },
    async cancel(id: string): Promise<boolean> {
      const result = await ReservationModel.updateOne(
        { publicId: id },
        { $set: { status: "CANCELLED" } },
      );
      return result.matchedCount > 0;
    },
    async getById(id: string): Promise<Reservation | undefined> {
      const record = await ReservationModel.findOne({ publicId: id })
        .populate<{ resourceId: ResourceRecord | null }>("resourceId")
        .lean();
      return record ? toResponse(record) : undefined;
    },
    async listForUser(userId: string): Promise<Reservation[]> {
      const records = await ReservationModel.find({
        userId,
        status: { $in: ["PENDING", "CONFIRMED"] },
      })
        .populate<{ resourceId: ResourceRecord | null }>("resourceId")
        .lean();
      return records.map(toResponse);
    },
  };
}
