import { beforeEach, expect, test } from "@jest/globals";
import request from "supertest";
import { createApp } from "../../app.js";
import { seedResources } from "../../services/seed.service.js";
import { ReservationModel } from "../../models/Reservation.model.js";
import { slot } from "../../test/fixtures.js";
const app = createApp();
const base = "/api/v1";
beforeEach(seedResources);
test("POST creates, conflicts, reads history, confirms, cancels and frees slot", async () => {
  const created = await request(app)
    .post(`${base}/reservations`)
    .send(slot)
    .expect(201);
  const record = await ReservationModel.findOne({
    userId: slot.userId,
  }).orFail();
  expect(created.body).toEqual({
    ...slot,
    id: record.publicId,
    status: "CONFIRMED",
  });
  const url = `${base}/reservations/${record.publicId}`;
  await request(app)
    .post(`${base}/reservations`)
    .send(slot)
    .expect(409)
    .expect(({ body }) => expect(body.code).toBe("DOUBLE_BOOKING"));
  await request(app).get(url).expect(200, created.body);
  await request(app)
    .get(`${base}/reservations/user/${slot.userId}`)
    .expect(200, [created.body]);
  await request(app).get(`${base}/reservations/user/other`).expect(200, []);
  await request(app).patch(`${url}/confirm`).expect(200);
  await request(app).patch(`${url}/cancel`).expect(204);
  await request(app).delete(url).expect(204);
  await request(app).patch(`${url}/confirm`).expect(409);
  await request(app).post(`${base}/reservations`).send(slot).expect(201);
});
test.each(["get", "delete", "confirm", "cancel"])(
  "missing reservation %s is 404",
  async (action) => {
    const url = `${base}/reservations/missing`;
    const response =
      action === "get"
        ? request(app).get(url)
        : action === "delete"
          ? request(app).delete(url)
          : request(app).patch(`${url}/${action}`);
    await response
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe("NOT_FOUND"));
  },
);
test.each([
  {},
  { userId: "" },
  { userId: "  " },
  { resourceId: 12 },
  { startTime: null },
  { startTime: "invalid" },
  { startTime: "2026-02-30T10:00:00Z" },
  { startTime: "2026-10-01T10:00:00" },
  { endTime: slot.startTime },
  { endTime: "2026-10-01T09:00:00Z" },
  { status: "CANCELLED" },
])("rejects malformed payload patch %j", async (patch) => {
  const payload = Object.keys(patch).length === 0 ? {} : { ...slot, ...patch };
  await request(app).post(`${base}/reservations`).send(payload).expect(400);
  expect(await ReservationModel.countDocuments()).toBe(0);
});
test.each(["resourceId", "userId", "startTime", "endTime"])(
  "rejects missing %s",
  async (key) => {
    const payload: Record<string, unknown> = { ...slot };
    delete payload[key];
    await request(app).post(`${base}/reservations`).send(payload).expect(400);
  },
);
test("rejects nonobject JSON and malformed JSON", async () => {
  await request(app).post(`${base}/reservations`).send([]).expect(400);
  await request(app)
    .post(`${base}/reservations`)
    .set("Content-Type", "application/json")
    .send("{")
    .expect(400);
});
test("maps unknown resource and unavailable resource failures", async () => {
  await request(app)
    .post(`${base}/reservations`)
    .send({ ...slot, resourceId: "missing" })
    .expect(400);
  await request(app)
    .post(`${base}/reservations`)
    .send({ ...slot, resourceId: "res-104" })
    .expect(409);
});
test("concurrent HTTP booking attempts return one 201 and remaining 409", async () => {
  const responses = await Promise.all(
    Array.from({ length: 4 }, () =>
      request(app).post(`${base}/reservations`).send(slot),
    ),
  );
  expect(responses.map((r) => r.status).sort()).toEqual([201, 409, 409, 409]);
  expect(await ReservationModel.countDocuments()).toBe(1);
});
test.each([
  ["", 4],
  ["type=ROOM", 2],
  ["type=EQUIPMENT", 1],
  ["type=LAB", 1],
  ["isAvailable=true", 3],
  ["isAvailable=false", 1],
  ["type=ROOM&isAvailable=false", 1],
  ["type=LAB&isAvailable=false", 0],
] as const)("resource filter %s", async (query, count) => {
  const response = await request(app)
    .get(`${base}/resources?${query}`)
    .expect(200);
  const records: unknown = response.body;
  expect(Array.isArray(records)).toBe(true);
  expect(records).toHaveLength(count);
  if (Array.isArray(records))
    for (const record of records) {
      expect(record).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
        }),
      );
      const params = new URLSearchParams(query);
      if (params.has("type"))
        expect(record).toHaveProperty("type", params.get("type"));
      if (params.has("isAvailable"))
        expect(record).toHaveProperty(
          "isAvailable",
          params.get("isAvailable") === "true",
        );
    }
});
test.each([
  "type=",
  "type=UNKNOWN",
  "type=ROOM&type=LAB",
  "isAvailable=",
  "isAvailable=1",
  "isAvailable=TRUE",
  "isAvailable=true&isAvailable=false",
])("rejects invalid filter %s", async (query) => {
  await request(app).get(`${base}/resources?${query}`).expect(400);
});
test("health endpoint", async () => {
  await request(app)
    .get(`${base}/health`)
    .expect(200)
    .expect(({ body }) => {
      expect(body.status).toBe("ok");
      expect(Number.isFinite(Date.parse(body.timestamp))).toBe(true);
    });
});
