import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../src/app.js";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { ResourceModel } from "../src/models/Resource.model.js";
import { ReservationModel } from "../src/models/Reservation.model.js";
import { seedResources } from "../src/services/seed.service.js";
let database: MongoMemoryReplSet | undefined;
before(async () => {
  database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await connectDatabase(database.getUri());
  await ResourceModel.init();
  await ReservationModel.init();
});
beforeEach(async () => {
  await ReservationModel.deleteMany({});
  await ResourceModel.deleteMany({});
  await seedResources();
});
after(async () => {
  await disconnectDatabase();
  await database?.stop();
});
test("HTTP contract and reservation edge cases", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const request = async (path: string, body?: unknown) => {
    const res = await fetch(
      base + path,
      body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
    );
    return { status: res.status, body: await res.json() };
  };
  const slot = {
    resourceId: "res-101",
    userId: "user-456",
    startTime: "2026-10-01T10:00:00Z",
    endTime: "2026-10-01T11:00:00Z",
  };
  try {
    assert.equal((await request("/resources")).body.length, 4);
    const health = await request("/health");
    assert.equal(health.status, 200);
    assert.equal(health.body.status, "ok");
    const rooms = await request("/resources?type=ROOM");
    assert.equal(rooms.status, 200);
    assert(
      rooms.body.every(
        (r: unknown) =>
          typeof r === "object" &&
          r !== null &&
          "type" in r &&
          r.type === "ROOM",
      ),
    );
    for (const q of ["type=", "type=STUDY_ROOM", "type=ROOM&type=LAB"])
      assert.equal((await request("/resources?" + q)).status, 400);
    const created = await request("/reservations", slot);
    assert.equal(created.status, 201);
    assert.equal(created.body.status, "CONFIRMED");
    assert.equal(typeof created.body.id, "string");
    const found = await request(`/reservations/${created.body.id}`);
    assert.equal(found.status, 200);
    assert.deepEqual(found.body, created.body);
    for (const id of [
      "nonexistent-id",
      "00000000-0000-0000-0000-000000000000",
      slot.resourceId,
    ]) {
      const missing = await request(`/reservations/${id}`);
      assert.equal(missing.status, 404);
      assert.deepEqual(missing.body, {
        code: "NOT_FOUND",
        message: "Reservation not found.",
      });
    }
    const duplicate = await request("/reservations", slot);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.code, "DOUBLE_BOOKING");
    for (const times of [
      { startTime: "2026-10-01T09:30:00Z", endTime: "2026-10-01T10:30:00Z" },
      {
        startTime: "2026-10-01T12:00:00+02:00",
        endTime: "2026-10-01T13:00:00+02:00",
      },
    ])
      assert.equal(
        (await request("/reservations", { ...slot, ...times })).status,
        409,
      );
    assert.equal(
      (
        await request("/reservations", {
          ...slot,
          startTime: slot.endTime,
          endTime: "2026-10-01T12:00:00Z",
        })
      ).status,
      201,
    );
    assert.equal(
      (await request("/reservations", { ...slot, resourceId: "res-102" }))
        .status,
      201,
    );
    assert.equal(
      (await request("/reservations", { ...slot, resourceId: "res-104" }))
        .status,
      409,
    );
    for (const patch of [
      { userId: "" },
      { resourceId: "missing" },
      { startTime: "2026-02-30T10:00:00Z" },
      { startTime: "2026-10-01T10:00:00" },
      { endTime: slot.startTime },
      { status: "CANCELLED" },
    ]) {
      const r = await request("/reservations", { ...slot, ...patch });
      assert.equal(r.status, 400);
      assert.equal(
        r.body.code,
        "resourceId" in patch ? "UNKNOWN_RESOURCE" : "VALIDATION_ERROR",
      );
    }
    assert.equal((await request("/reservations", {})).status, 400);
    const malformed = await fetch(base + "/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(malformed.status, 400);
    const users = await request("/reservations/user/user-456");
    assert.equal(users.status, 200);
    assert.equal(users.body.length, 3);
    assert.deepEqual((await request("/reservations/user/unknown")).body, []);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});

test("DELETE cancels reservations, releases slots, and returns JSON 404 for unknown IDs", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const slot = {
    resourceId: "res-101",
    userId: "cancel-user",
    startTime: "2026-10-01T10:00:00Z",
    endTime: "2026-10-01T11:00:00Z",
  };
  const create = (): Promise<Response> =>
    fetch(`${base}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slot),
    });
  try {
    const created = await create();
    assert.equal(created.status, 201);
    const reservation: unknown = await created.json();
    assert(
      typeof reservation === "object" &&
        reservation !== null &&
        "id" in reservation &&
        typeof reservation.id === "string",
    );
    const url = `${base}/reservations/${reservation.id}`;
    assert.equal((await create()).status, 409);
    const missing = await fetch(`${base}/reservations/nonexistent`, {
      method: "DELETE",
    });
    assert.equal(missing.status, 404);
    assert.match(
      missing.headers.get("content-type") ?? "",
      /application\/json/,
    );
    assert.deepEqual(await missing.json(), {
      code: "NOT_FOUND",
      message: "Reservation not found.",
    });
    // A failed cancellation must not release another reservation's slot.
    assert.equal((await create()).status, 409);
    for (let attempt = 0; attempt < 2; attempt++) {
      const cancelled = await fetch(url, { method: "DELETE" });
      assert.equal(cancelled.status, 204);
      assert.equal(await cancelled.text(), "");
    }
    const found = await fetch(url);
    assert.equal(found.status, 200);
    assert.deepEqual(await found.json(), {
      ...reservation,
      status: "CANCELLED",
    });
    const active = await fetch(`${base}/reservations/user/cancel-user`);
    assert.equal(active.status, 200);
    assert.deepEqual(await active.json(), []);
    assert.equal((await create()).status, 201);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("concurrent booking is atomic and survives a new app instance", async () => {
  const first = createApp().listen(0, "127.0.0.1");
  const second = createApp().listen(0, "127.0.0.1");
  await Promise.all([once(first, "listening"), once(second, "listening")]);
  const firstAddress = first.address(),
    secondAddress = second.address();
  assert(firstAddress && typeof firstAddress !== "string");
  assert(secondAddress && typeof secondAddress !== "string");
  const firstBase = `http://127.0.0.1:${firstAddress.port}/api/v1`;
  const secondBase = `http://127.0.0.1:${secondAddress.port}/api/v1`;
  try {
    const results = await Promise.all(
      [firstBase, secondBase].map((base) =>
        fetch(`${base}/reservations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resourceId: "res-101",
            userId: "parallel-user",
            startTime: "2026-10-01T10:00:00Z",
            endTime: "2026-10-01T11:00:00Z",
          }),
        }),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.equal(await ReservationModel.countDocuments(), 1);
    const read = await fetch(`${secondBase}/reservations/user/parallel-user`);
    const records: unknown = await read.json();
    assert(Array.isArray(records));
    assert.equal(records.length, 1);
    await disconnectDatabase();
    assert(database);
    await connectDatabase(database.getUri());
    const persisted = await fetch(
      `${firstBase}/reservations/user/parallel-user`,
    );
    assert.deepEqual(await persisted.json(), records);
  } finally {
    await Promise.all(
      [first, second].map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
    );
  }
});

test("PENDING blocks overlap and seeding preserves existing records", async () => {
  const resource = await ResourceModel.findOne({ publicId: "res-101" });
  assert(resource);
  await seedResources();
  assert.equal(await ResourceModel.countDocuments(), 4);
  const { createReservationService } =
    await import("../src/services/reservation.service.js");
  const service = createReservationService();
  const slot = {
    resourceId: "res-101",
    userId: "pending-user",
    startTime: "2026-10-01T10:00:00Z",
    endTime: "2026-10-01T11:00:00Z",
  };
  const created = await service.create(slot);
  await ReservationModel.updateOne(
    { publicId: created.id },
    { $set: { status: "PENDING" } },
  );
  await assert.rejects(service.create(slot), { code: "DOUBLE_BOOKING" });
  assert.equal(
    (await service.listForUser("pending-user"))[0]?.status,
    "PENDING",
  );
});
