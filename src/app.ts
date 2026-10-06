import express, { type Express } from "express";
import { pathToFileURL } from "node:url";
import { createReservationRouter } from "./routes/reservation.routes.js";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { describeStartupError } from "./config/startup-error.js";

import { errorHandler } from "./middleware/error.middleware.js";
import { healthRouter } from "./routes/health.routes.js";

import { readEnvironment } from "./config/environment.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { resourceRouter } from "./routes/resource.routes.js";

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/resources", resourceRouter);
  app.use("/api/v1", createReservationRouter());
  app.use(errorHandler);

  return app;
}

export async function startServer(): Promise<Server> {
  const config = readEnvironment();
  await connectDatabase(config.mongodbUri);
  const server = createServer(createApp());
  try {
    const listening = once(server, "listening");
    server.listen(config.port);
    await listening;
  } catch (error: unknown) {
    await disconnectDatabase();
    throw error;
  }
  console.log(`CampusHub API listening on port ${config.port}`);
  server.on("error", (error: Error) => {
    console.error(describeStartupError(error));
    server.close(() => {
      void disconnectDatabase().catch(() => {
        process.exitCode = 1;
      });
    });
    process.exitCode = 1;
  });
  const shutdown = (): void => {
    server.close(() => {
      void disconnectDatabase().catch(() => {
        process.exitCode = 1;
      });
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer().catch((error: unknown) => {
    console.error(`Startup failed: ${describeStartupError(error)}`);
    process.exitCode = 1;
  });
}
