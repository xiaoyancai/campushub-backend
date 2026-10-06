import { ResourceModel } from "../models/Resource.model.js";
import type { Resource } from "../types/reservation.js";
const samples: Resource[] = [
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

export async function seedResources(): Promise<void> {
  for (const { id, ...resource } of samples) {
    await ResourceModel.updateOne(
      { publicId: id },
      {
        $setOnInsert: { publicId: id, ...resource, bookingVersion: 0 },
      },
      { upsert: true, runValidators: true },
    );
  }
}
