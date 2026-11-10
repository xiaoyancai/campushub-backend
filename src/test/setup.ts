import { resolve } from "node:path";
import { beforeAll, beforeEach, afterAll } from "@jest/globals";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { ResourceModel } from "../models/Resource.model.js";
import { ReservationModel } from "../models/Reservation.model.js";
let database: MongoMemoryReplSet | undefined;
beforeAll(async () => {
  database = await MongoMemoryReplSet.create({
    binary: { downloadDir: resolve("node_modules/.cache/mongodb-binaries") },
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await connectDatabase(database.getUri());
  await Promise.all([ResourceModel.init(), ReservationModel.init()]);
});
beforeEach(async () => {
  await ReservationModel.deleteMany({});
  await ResourceModel.deleteMany({});
});
afterAll(async () => {
  try {
    await disconnectDatabase();
  } finally {
    await database?.stop();
  }
});
