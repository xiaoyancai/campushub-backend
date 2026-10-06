# CampusHub Backend — Database and Layer Isolation Lab

TypeScript, Express 5 and Mongoose, with request flow **route → controller → service → model**. The Lab 2 OpenAPI contract in `docs/openapi.yaml` remains unchanged.

## Setup

Use Node.js 22.12+ and install dependencies with `npm ci`. MongoDB must be a **replica set** (including a single-node local replica set) or a transaction-capable Atlas cluster. A standalone MongoDB server cannot run the booking transaction.

If Docker is installed, one local setup is:

```bash
docker run -d --name campushub-mongo -p 127.0.0.1:27017:27017 -v campushub-data:/data/db mongo:8 --replSet rs0 --bind_ip_all
docker exec campushub-mongo mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
# Wait until this reports true before seeding:
docker exec campushub-mongo mongosh --quiet --eval 'db.hello().isWritablePrimary'
export MONGODB_URI='mongodb://127.0.0.1:27017/campushub?replicaSet=rs0'
npm run seed
npm run dev
```

The local URI above has no credentials. For Atlas, set `MONGODB_URI` privately in your shell. `.env.example` documents configuration; the app does not automatically load `.env` files. `PORT` defaults to 3000. Startup waits for MongoDB before listening and fails if configuration or connectivity is missing. `npm start` uses compiled output after `npm run build`.

`npm run seed` inserts the four Lab 2 resources only if absent. It does not overwrite resources or clear reservations. New databases have no resources until seeded; API startup never seeds automatically. Data survives app restarts. Rerunning the same manual reservation request may therefore return 409; cancel the previous reservation or use a new time slot to repeat a 201 test.

## Structure and compatibility

- `src/models/Resource.model.ts`, `Reservation.model.ts`: exported strict persisted interfaces and Mongoose schemas.
- `src/routes/`: endpoint mappings to controllers.
- `src/controllers/`: typed input validation, service calls and HTTP responses.
- `src/services/`: persistence operations and reservation rules, with no HTTP dependency.
- `src/config/`: environment parsing and database connection lifecycle.
- `src/app.ts`: middleware, routes, database startup and shutdown.
- `src/seed.ts`: explicit lab fixture command delegating database work to a service.

Resources retain public IDs such as `res-101`; reservations retain generated UUIDs. `Reservation.resourceId` in MongoDB is an ObjectId reference, translated to the public resource ID in responses. Mongoose documents, internal version fields and `_id` are not exposed. Date values are returned as equivalent UTC ISO timestamps (including milliseconds).

Booking writes increment an internal resource `bookingVersion` within the same transaction as overlap checking and insertion. Competing bookings on the same resource cause a write conflict and transaction retry, so only one overlapping request succeeds, even across app instances. The overlap rule remains `[startTime, endTime)`; adjacent slots are allowed.

The Lab 2 contract has `security: []` and no tenant or authentication context. This lab preserves that scope; it does not implement production multi-tenant access control or accept a client-supplied tenant identifier.

## Automated verification

```bash
npm run typecheck
npm run build
npm test
```

Tests start an isolated, real single-node MongoDB replica set with the development-only `mongodb-memory-server` package. The first run needs network access to download MongoDB and a writable binary cache. No existing database or personal data is used. Fixtures are reset between tests, and the temporary server is stopped afterward. The original HTTP regression cases are retained, with additional concurrency, persistence, PENDING conflict and idempotent seed cases.

## Required student work

Part 3 of the assignment explicitly requires a **manual code audit without AI**. Perform that review yourself (keeping notes is recommended, not a separate required deliverable), then rerun the manual Lab 2 HTTP tests below against your configured database. Automated checks do not replace that requirement. After review, commit and push the changes and submit your repository URL to Canvas.

## Manual HTTP tests

```bash
curl -i 'http://localhost:3000/api/v1/resources'
curl -i 'http://localhost:3000/api/v1/resources?type=ROOM'
curl -i 'http://localhost:3000/api/v1/resources?type='
curl -i -X POST 'http://localhost:3000/api/v1/reservations' \
  -H 'Content-Type: application/json' \
  -d '{"resourceId":"res-101","userId":"user-456","startTime":"2026-10-01T10:00:00Z","endTime":"2026-10-01T11:00:00Z"}'
# Repeat the POST above: 409 DOUBLE_BOOKING.
curl -i 'http://localhost:3000/api/v1/reservations/user/user-456'
curl -i -X POST 'http://localhost:3000/api/v1/reservations' \
  -H 'Content-Type: application/json' -d '{}'
```

Expected statuses in order: 200, 200, 400, 201 (409 on repetition), 200, 400.

## Contract decisions

- Resource types are ROOM, EQUIPMENT and LAB. The assignment's STUDY_ROOM example conflicts with its enum; use ROOM. Invalid or empty filters return 400.
- Reservation id/status are server-managed readOnly fields. The request uses the Reservation schema but supplies only resourceId, userId, startTime and endTime. Responses contain all six fields; new reservations are CONFIRMED.
- Timestamps use format: date-time and additional syntax/calendar validation. Require timezone and uppercase T/Z, with optional 1–3 fractional digits. Invalid dates and endTime <= startTime return 400.
- Overlap uses half-open intervals [startTime, endTime), allowing adjacent bookings. Timezones are compared as instants. PENDING and CONFIRMED block overlaps; CANCELLED does not.
- Active means PENDING or CONFIRMED regardless of date. Unknown students return an empty array. DELETE /api/v1/reservations/{id} marks an existing reservation CANCELLED and returns 204 with no body; repeated cancellation also returns 204. Unknown IDs return 404 with code/message. Cancelled records remain available through GET by ID, are excluded from active listings, and release their time slots.
- isAvailable is operational availability, independent of booked time slots. Unavailable resources return 409 RESOURCE_UNAVAILABLE; unknown IDs return 400 UNKNOWN_RESOURCE.
- Responses use 200/201/400/409/500 as documented, with standardized code/message errors.

## Model validation and startup diagnostics

Reservation document validation rejects whitespace-only user IDs and end times that are not after start times. These checks protect normal document `save()`/`create()` operations, including direct model use. They are not MongoDB collection constraints: raw writes and query updates can bypass document validation. Change reservation time ranges by loading the document and calling `save()`; the existing cancellation query changes only status.

Startup logs distinguish missing configuration, invalid port, malformed database configuration, authentication failure, database connectivity failure and port binding errors using fixed messages. Driver messages, connection URIs, causes and stacks are never logged. Unknown failures receive a generic safe message.
