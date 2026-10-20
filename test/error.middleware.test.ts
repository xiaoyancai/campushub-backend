import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { createApp } from "../src/app.js";
import { errorHandler } from "../src/middleware/error.middleware.js";

test("request parsing errors retain safe 4xx responses", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  try {
    const cases = [
      {
        path: "/reservations/%ZZ/cancel",
        options: { method: "PATCH" },
        status: 400,
        body: {
          code: "VALIDATION_ERROR",
          message: "Invalid URL parameter encoding.",
        },
      },
      {
        path: "/reservations",
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "private-value".repeat(10000) }),
        },
        status: 413,
        body: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request body is too large.",
        },
      },
      {
        path: "/reservations",
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=iso-8859-1" },
          body: '{"userId":"private-value"}',
        },
        status: 415,
        body: {
          code: "UNSUPPORTED_CHARSET",
          message: "Unsupported request charset.",
        },
      },
      {
        path: "/reservations",
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        },
        status: 400,
        body: {
          code: "VALIDATION_ERROR",
          message: "Malformed JSON request body.",
        },
      },
    ];
    for (const entry of cases) {
      const response = await fetch(base + entry.path, entry.options);
      assert.equal(response.status, entry.status);
      assert.match(
        response.headers.get("content-type") ?? "",
        /application\/json/,
      );
      assert.deepEqual(await response.json(), entry.body);
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("unknown errors and arbitrary status fields remain sanitized 500 responses", async () => {
  const failures: unknown[] = [
    new Error("private database details"),
    Object.assign(new Error("private details"), { status: 400 }),
    Object.assign(new Error("private details"), {
      status: 413,
      type: "unknown",
    }),
    Object.assign(new Error("private details"), {
      status: 401,
      type: "entity.too.large",
    }),
    { status: 415, type: "charset.unsupported", message: "private details" },
    new URIError("private details"),
  ];
  const app = express();
  failures.forEach((failure, index) => {
    app.get(`/failure/${index}`, (_request, _response, next) => next(failure));
  });
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  try {
    for (let index = 0; index < failures.length; index++) {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/failure/${index}`,
      );
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      });
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
