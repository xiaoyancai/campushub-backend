import { test } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { ReservationModel } from "../src/models/Reservation.model.js";
import { ConfigurationError } from "../src/config/environment.js";
import { describeStartupError } from "../src/config/startup-error.js";

test("model rejects blank users and invalid time ranges without HTTP validation", async () => {
  const input = {
    publicId: "model-test",
    resourceId: new Types.ObjectId(),
    userId: "user",
    startTime: new Date("2026-10-01T10:00:00Z"),
    endTime: new Date("2026-10-01T11:00:00Z"),
  };
  await new ReservationModel(input).validate();
  for (const patch of [
    { userId: " \t\n" },
    { endTime: input.startTime },
    { endTime: new Date("2026-10-01T09:00:00Z") },
  ]) {
    await assert.rejects(
      new ReservationModel({ ...input, ...patch }).validate(),
      { name: "ValidationError" },
    );
  }
  const document = new ReservationModel(input);
  document.startTime = new Date("2026-10-01T12:00:00Z");
  await assert.rejects(document.validate(), { name: "ValidationError" });
});
test("startup diagnostics distinguish causes without echoing driver secrets", () => {
  assert.equal(
    describeStartupError(new ConfigurationError("MONGODB_URI is required")),
    "MONGODB_URI is required",
  );
  const cases = [
    [{ code: "EADDRINUSE" }, /already in use/],
    [{ code: 18 }, /authentication failed/],
    [{ name: "MongoParseError" }, /Invalid MongoDB/],
    [{ name: "MongooseServerSelectionError" }, /unreachable/],
    [{ name: "UnknownError" }, /Unexpected/],
  ] as const;
  for (const [fields, expected] of cases) {
    const message = describeStartupError({
      ...fields,
      message: "mongodb://admin:secret@private-host/db",
      cause: new Error("secret"),
    });
    assert.match(message, expected);
    assert.doesNotMatch(message, /secret|private-host|mongodb:\/\//);
  }
});
