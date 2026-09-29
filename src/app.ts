import express, { type Express } from "express";
import { pathToFileURL } from "node:url";
import { createReservationRouter } from "./routes/reservation.routes.js";
import type { Server } from "node:http";

import { errorHandler } from "./middleware/error.middleware.js";
import { healthRouter } from "./routes/health.routes.js";

const DEFAULT_PORT = 3000;

function resolvePort(rawPort: string | undefined): number {
  if (rawPort === undefined) {
    return DEFAULT_PORT;
  }

  const parsedPort = Number(rawPort);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return parsedPort;
}

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1", createReservationRouter());
  app.use(errorHandler);

  return app;
}

function startServer(): Server {
  const port = resolvePort(process.env.PORT);
  const server = createApp().listen(port, () => {
    console.log(`CampusHub API listening on port ${port}`);
  });

  server.on("error", (error: Error) => {
    console.error("CampusHub API failed", error);
    process.exitCode = 1;
  });

  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer();
}
