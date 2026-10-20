import { ResourceModel } from "../models/Resource.model.js";
import type { Resource, ResourceType } from "../types/reservation.js";
export interface ResourceService {
  list(type?: ResourceType, isAvailable?: boolean): Promise<Resource[]>;
}
export function createResourceService(): ResourceService {
  return {
    async list(
      type?: ResourceType,
      isAvailable?: boolean,
    ): Promise<Resource[]> {
      const records = await ResourceModel.find({
        ...(type === undefined ? {} : { type }),
        ...(isAvailable === undefined ? {} : { isAvailable }),
      })
        .sort({ publicId: 1 })
        .lean();
      return records.map((r): Resource => ({
        id: r.publicId,
        name: r.name,
        type: r.type,
        location: r.location,
        isAvailable: r.isAvailable,
      }));
    },
  };
}
