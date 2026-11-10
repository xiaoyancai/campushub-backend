import { beforeEach, describe, expect, test } from "@jest/globals";
import { createReservationService } from "../reservation.service.js";
import { seedResources } from "../seed.service.js";
import { createResourceService } from "../resource.service.js";
import { ResourceModel } from "../../models/Resource.model.js";
import { ReservationModel } from "../../models/Reservation.model.js";
import { slot } from "../../test/fixtures.js";
const service = createReservationService();
beforeEach(seedResources);
describe("reservation service with isolated MongoDB", () => {
  test("creates resources idempotently and preserves edits", async () => {
    await ResourceModel.updateOne(
      { publicId: slot.resourceId },
      { $set: { name: "Edited room" } },
    );
    await seedResources();
    const resources = await createResourceService().list();
    expect(resources).toHaveLength(4);
    expect(resources[0]?.name).toBe("Edited room");
  });
  test("creates, reads, lists, confirms and cancels a reservation", async () => {
    const created = await service.create(slot);
    expect(created).toEqual({
      ...slot,
      id: expect.any(String),
      status: "CONFIRMED",
    });
    expect(await service.getById(created.id)).toEqual(created);
    expect(await service.listForUser(slot.userId)).toEqual([created]);
    expect(await service.listForUser("other")).toEqual([]);
    await ReservationModel.updateOne(
      { publicId: created.id },
      { $set: { status: "PENDING" } },
    );
    expect((await service.confirm(created.id))?.status).toBe("CONFIRMED");
    expect(await service.cancel(created.id)).toBe(true);
    expect(await service.cancel(created.id)).toBe(true);
    expect((await service.getById(created.id))?.status).toBe("CANCELLED");
    await expect(service.confirm(created.id)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    await expect(service.create(slot)).resolves.toMatchObject({
      status: "CONFIRMED",
    });
  });
  test.each([
    [slot.startTime, slot.endTime],
    ["2026-10-01T09:00:00.000Z", "2026-10-01T10:00:00.001Z"],
    ["2026-10-01T10:59:59.999Z", "2026-10-01T12:00:00.000Z"],
    ["2026-10-01T10:15:00Z", "2026-10-01T10:45:00Z"],
    ["2026-10-01T09:00:00Z", "2026-10-01T12:00:00Z"],
    ["2026-10-01T12:00:00+02:00", "2026-10-01T13:00:00+02:00"],
  ])("rejects overlap %s to %s", async (startTime, endTime) => {
    await service.create(slot);
    await expect(
      service.create({ ...slot, startTime, endTime }),
    ).rejects.toMatchObject({ code: "DOUBLE_BOOKING" });
    expect(await ReservationModel.countDocuments()).toBe(1);
  });
  test("allows exactly adjacent intervals and other resources", async () => {
    await service.create(slot);
    await service.create({
      ...slot,
      startTime: "2026-10-01T09:00:00Z",
      endTime: slot.startTime,
    });
    await service.create({
      ...slot,
      startTime: slot.endTime,
      endTime: "2026-10-01T12:00:00Z",
    });
    await service.create({ ...slot, resourceId: "res-102" });
    expect(await ReservationModel.countDocuments()).toBe(4);
  });
  test.each([
    { startTime: "invalid" },
    { endTime: "invalid" },
    { endTime: slot.startTime },
    { endTime: "2026-10-01T09:59:59.999Z" },
  ])("rejects invalid date/range %j without writing", async (patch) => {
    await expect(service.create({ ...slot, ...patch })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(await ReservationModel.countDocuments()).toBe(0);
  });
  test("handles missing IDs and unavailable resources", async () => {
    await expect(
      service.create({ ...slot, resourceId: "missing" }),
    ).rejects.toMatchObject({ code: "UNKNOWN_RESOURCE" });
    await expect(
      service.create({ ...slot, resourceId: "res-104" }),
    ).rejects.toMatchObject({ code: "RESOURCE_UNAVAILABLE" });
    expect(await service.getById("missing")).toBeUndefined();
    expect(await service.confirm("missing")).toBeUndefined();
    expect(await service.cancel("missing")).toBe(false);
  });
  test("PENDING blocks slots and concurrent attempts have exactly one winner", async () => {
    const outcomes = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        service.create({ ...slot, userId: `student-${i}` }),
      ),
    );
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const result of outcomes)
      if (result.status === "rejected")
        expect(result.reason).toMatchObject({ code: "DOUBLE_BOOKING" });
    expect(await ReservationModel.countDocuments()).toBe(1);
    await ReservationModel.updateMany({}, { $set: { status: "PENDING" } });
    await expect(service.create(slot)).rejects.toMatchObject({
      code: "DOUBLE_BOOKING",
    });
  });
  test("reports orphaned resources instead of returning corrupt data", async () => {
    const created = await service.create(slot);
    await ResourceModel.deleteMany({});
    await expect(service.getById(created.id)).rejects.toThrow(
      "Reservation resource is missing",
    );
  });
});
