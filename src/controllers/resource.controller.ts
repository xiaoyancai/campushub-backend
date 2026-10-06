import type { RequestHandler } from "express";
import { createResourceService } from "../services/resource.service.js";
import type { Resource, ErrorResponse } from "../types/reservation.js";
const service = createResourceService();
export const listResources: RequestHandler<
  Record<string, string>,
  Resource[] | ErrorResponse,
  unknown,
  Record<string, unknown>
> = async (request, response): Promise<void> => {
  const type = request.query.type;
  if (
    type !== undefined &&
    type !== "ROOM" &&
    type !== "EQUIPMENT" &&
    type !== "LAB"
  ) {
    response
      .status(400)
      .json({
        code: "VALIDATION_ERROR",
        message: "type must be ROOM, EQUIPMENT, or LAB when provided.",
      });
    return;
  }
  response.status(200).json(await service.list(type));
};
