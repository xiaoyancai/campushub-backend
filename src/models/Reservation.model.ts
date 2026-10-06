import { Schema, model, type Types } from "mongoose";
import type { ReservationStatus } from "../types/reservation.js";

export interface ReservationRecord {
  _id: Types.ObjectId;
  publicId: string;
  resourceId: Types.ObjectId;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
}
export const reservationSchema: Schema<ReservationRecord> =
  new Schema<ReservationRecord>(
    {
      publicId: { type: String, required: true, unique: true },
      resourceId: {
        type: Schema.Types.ObjectId,
        ref: "Resource",
        required: true,
      },
      userId: {
        type: String,
        required: true,
        validate: {
          validator: (value: string): boolean => value.trim().length > 0,
          message: "userId must contain a non-whitespace character.",
        },
      },
      startTime: { type: Date, required: true },
      endTime: {
        type: Date,
        required: true,
        validate: {
          validator: function (this: unknown, value: Date): boolean {
            return (
              typeof this === "object" &&
              this !== null &&
              "startTime" in this &&
              this.startTime instanceof Date &&
              value > this.startTime
            );
          },
          message: "endTime must be after startTime.",
        },
      },
      status: {
        type: String,
        enum: ["PENDING", "CONFIRMED", "CANCELLED"],
        required: true,
        default: "CONFIRMED",
      },
    },
    { strict: "throw" },
  );
reservationSchema.index({ resourceId: 1, status: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ userId: 1, status: 1 });
export const ReservationModel = model<ReservationRecord>(
  "Reservation",
  reservationSchema,
);
