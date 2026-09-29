# CampusHub Reservation Engine

Lab 2 implementation using the existing Node.js, TypeScript and Express stack. No database is needed for local testing.

## Run and verify

```bash
npm install
npm run typecheck
npm run build
npm test
npx @redocly/cli lint docs/openapi.yaml
npm run dev
```

The default port is 3000 (override with PORT). `npm run dev` runs TypeScript directly; `npm start` runs the compiled dist/app.js after building.

## Deliverables

- docs/openapi.yaml: authoritative OpenAPI 3.0.3 contract.
- src/types/reservation.ts: API interfaces and request types.
- src/routes/reservation.routes.ts: endpoint mappings.
- src/controllers/reservation.controller.ts: typed HTTP validation and responses.
- src/services/reservation.service.ts: in-memory resources and conflict rules.

The existing health endpoint remains at GET /api/v1/health. Routes follow the repository's route → controller → service separation. No persistence models or database are required for this in-memory lab. Each app instance owns its reservation data; restarting clears reservations. This demo has no authentication or tenant context and is not a production multi-tenant implementation.

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
- Active means PENDING or CONFIRMED regardless of date. Unknown students return an empty array. Cancellation is outside this assignment's required endpoints.
- isAvailable is operational availability, independent of booked time slots. Unavailable resources return 409 RESOURCE_UNAVAILABLE; unknown IDs return 400 UNKNOWN_RESOURCE.
- Responses use 200/201/400/409/500 as documented, with standardized code/message errors.

Automated tests exercise real local HTTP requests, including overlapping bookings, timezone equivalence, adjacent slots, invalid dates, malformed JSON, resource filters and the existing health endpoint. OpenAPI lint may report a localhost warning because the lab explicitly requires a local server URL.
