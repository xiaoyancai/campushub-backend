# Lab 4 steering log

The following incidents occurred during the implementation of CampusHub’s Reservation Engine. Each entry documents the initial issue, its root cause, the remediation instructions, and the verification results.

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

### Incident 3: Recognized client request errors incorrectly returned 500

- **Initial Agent Output:** Review of the existing implementation reproduced HTTP 500 with the sanitized `INTERNAL_ERROR` body for `PATCH /api/v1/reservations/%ZZ/cancel`, POST JSON exceeding the default 100 KB parser limit, and POST JSON using `charset=iso-8859-1`. These should return 400, 413, and 415 respectively. This was a review finding corrected through user prompting, not a recurring failure loop.
- **Root Cause:** The error middleware recognized only `entity.parse.failed` as a client error. Every other exception, including known Express router and body-parser errors, fell through to HTTP 500.
- **Remediation Prompt:** The exact user-provided prompt was:

```text
Fix the reproduced client-error misclassification in
src/middleware/error.middleware.ts.

Preserve the appropriate HTTP status for recognized Express request
errors:
- Invalid URL parameter encoding: 400
- Request body too large: 413
- Unsupported request charset: 415

Use the existing JSON error-response structure. Do not expose raw
exception messages, stack traces, request bodies, or internal details.
Unexpected errors must still return a sanitized 500 response.
Do not blindly trust arbitrary status fields on unknown errors.

Add regression tests for all three reproduced cases and verify that
unexpected errors still return a sanitized 500. Update OpenAPI to
document the affected responses.

Run npm run typecheck, npm run build, and npm test.
Report the actual results.

Append Incident 3 to docs/lab4-steering-log.md using the required
template. Record the reproduced behavior, root cause, this exact
user-provided remediation prompt, and the actual verification results.
Describe it as a review finding corrected through user prompting;
do not claim it was a recurring failure loop.

Keep the change focused on this issue. Do not commit or push yet.
```

- **Resolution:** Added a narrow mapping for an Error with the recognized parser type and matching status, or a URIError with status 400. Responses use fixed code/message values; unknown errors, arbitrary status fields, mismatched parser statuses, and plain objects still produce a sanitized 500. Added real HTTP regression tests for all three reproduced requests, malformed JSON, and unexpected error sanitization. Updated OpenAPI responses and the API status-code type. `npm run typecheck` and `npm run build` passed. The initial test run was blocked by sandbox port permissions (`EPERM`); after permission was granted, all three requested commands were rerun successfully, with `npm test` reporting 9 passed, 0 failed. No commit or push was performed.
