# Lab 4 steering log

These incidents occurred during this implementation. The remediation instructions below were agent self-corrections, not prompts attributed to the student. No recurring failure loop was observed; the concrete incorrect assumption and integration failure are recorded honestly.

### Incident 1: Invented fixture expectation in availability test

- **Initial Agent Output:** The new HTTP test expected zero results for `type=ROOM&isAvailable=false`. Running `npm test` produced `1 !== 0` (six tests passed and one failed).
- **Root Cause:** The agent wrote a count assertion before reading `src/services/seed.service.ts`. The actual fixture `res-104` is an unavailable ROOM. The production filter was correct; the expected count was invented.
- **Remediation Prompt:** "Read the seed fixtures before asserting counts; test both matching and empty combinations without changing production logic to satisfy an incorrect expectation."
- **Resolution:** Read the seed fixtures, changed the unavailable ROOM expectation to one, and added unavailable LAB as an actual empty combination. All seven tests passed afterward. Manual curl checks also verified available and unavailable room filtering.

### Incident 2: Old active-only test contradicted the updated history contract

- **Initial Agent Output:** The first implementation changed `listForUser` to include all bookings but left the old cancellation regression test expecting an empty array. The first run passed five tests and failed one because the response correctly included the cancelled reservation.
- **Root Cause:** The earlier OpenAPI contract and test described active-only listings, whereas the current assignment asks for all bookings. The service change had not yet been propagated to the test and documentation.
- **Remediation Prompt:** "Preserve the current requirement to list all student bookings. Update the legacy assertion and OpenAPI description together, explicitly verify CANCELLED history, and retain the slot-release and idempotent cancellation checks."
- **Resolution:** The old regression test now expects the cancelled record, without removing its other checks. OpenAPI and README describe full history. Automated tests and manual requests verified retained cancelled history, immediate slot reuse, and rejection of confirmation after cancellation.

## Implementation constraints and verification

Preserved strict TypeScript, existing DTOs, the route → controller → service → model structure, safe centralized error handling, and the existing per-resource transaction that prevents concurrent double booking. No dependencies were added. Booking overlap remains `existing.startTime < new.endTime && existing.endTime > new.startTime` for PENDING and CONFIRMED records. Adjacent slots are valid.

New bookings remain CONFIRMED per the existing creation contract. The confirmation endpoint supports PENDING records and makes cancellation terminal. PATCH cancellation is idempotent and returns 204; the legacy DELETE endpoint remains available.

`npm run typecheck`, `npm run build`, and all seven tests passed. Eighteen manual curl checks passed; see `lab4-verification.md`. The inherited API has no authentication or tenant context; no claim of production tenant isolation is made.
