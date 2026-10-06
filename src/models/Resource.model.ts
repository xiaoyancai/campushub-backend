import { Schema, model, type Types } from "mongoose";
import type { ResourceType } from "../types/reservation.js";

export interface ResourceRecord {
  _id: Types.ObjectId;
  publicId: string;
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
  bookingVersion: number;
}
export const resourceSchema = new Schema<ResourceRecord>(
  {
    publicId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["ROOM", "EQUIPMENT", "LAB"], required: true },
    location: { type: String, required: true, trim: true },
    isAvailable: { type: Boolean, required: true, default: true },
    bookingVersion: { type: Number, required: true, default: 0 },
  },
  { strict: "throw" },
);
export const ResourceModel = model<ResourceRecord>("Resource", resourceSchema);
