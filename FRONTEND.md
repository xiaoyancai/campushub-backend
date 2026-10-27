# CampusHub frontend lab

React + TypeScript + Vite + Axios + CSS Modules. The existing backend and OpenAPI are retained. The frontend runs locally; no hosted deployment is required.

## Quick local review (no external MongoDB required)

Requires Node 22.12+ and npm. From this repository:

```bash
npm ci
npm ci --prefix client
npm run dev:lab
```

In a second terminal:

```bash
npm run dev --prefix client
```

Open http://127.0.0.1:5173. `dev:lab` starts the actual Express API with a temporary MongoDB replica set and four seeded resources. The first run downloads a MongoDB binary. Data resets on shutdown. For persistent data, use the existing backend setup with `MONGODB_URI`, seed via `npm run seed`, and use `npm run dev` instead. Do not run both APIs simultaneously.

## Implemented

- Resource cards, ROOM/EQUIPMENT/LAB API filters, empty/error/retry/loading states and unavailable-resource controls.
- Booking form validates timestamps and end > start, converts local times to ISO UTC, and submits exactly the four writable contract fields.
- Explicit DOUBLE_BOOKING and RESOURCE_UNAVAILABLE 409 alerts; retry after failures; 15-second request timeout.
- My bookings loads the selected student's active reservations, resolves resource names, cancels via DELETE (204), and refreshes from the API.
- Student ID switcher (not authentication). The current backend exposes userId and has no login/session contract.
- Stale read requests are aborted. Pending mutations disable controls. Frontend guidelines are appended to AGENTS.md.

The default Axios base URL is `/api/v1`. Vite proxies `/api` to `http://127.0.0.1:3000`, so local development needs no CORS change. For deployment, serve API and client under one origin or configure a real API URL and backend CORS. Optional configuration is documented in `client/.env.example`; Vite variables are public and must never contain secrets.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build --prefix client
npm test --prefix client
```

The full-stack Vitest test mounts the actual React components in jsdom and uses the real Express API and MongoDB. It verifies a duplicate booking alert, restored submit state, cancellation, list refresh, and released-slot rebooking. Unit tests additionally cover invalid ranges, contract payload fields, network failure recovery, supplementary resource-name failure, cancellation failure, and stale responses after filter/student changes. Backend tests cover concurrency and other API edge cases.

Manual audit: book Study Room 302; book the same resource/time again; expect the explicit conflict alert; close the form, open My bookings, cancel; book the same slot again. Type filters and student switching should refresh without stale data. Times are shown in your device timezone. API operational availability is not a guarantee that a particular time slot is free.

Lint uses the TypeScript/React ESLint tools installed in `client/`; install both dependency sets before running root `npm run lint`. Root lint checks backend, frontend, tools and tests. `npm run lint --prefix client` checks the frontend separately.
