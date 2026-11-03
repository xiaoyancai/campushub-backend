# Context and abstraction audit

## Findings and changes

- `CLAUDE.md` repeated frontend rules already maintained in `AGENTS.md`. Replaced those duplicates with a reference, source discovery scope, exclusions, and abstraction locations. Reduced from 1,094 to 640 UTF-8 bytes (41%). Retained repository architecture and security requirements in `AGENTS.md`.
- Added `.cursorignore` to exclude nested dependencies, builds, coverage, lockfiles, logs, generated API artifacts, and maps. This is a Cursor context filter, not an access-control boundary; other agents must follow the explicit source-scope instructions.
- Reservation controllers contained five repetitive catches; health had another. Express 5 automatically forwards thrown errors and rejected async handlers. Controllers now keep HTTP input validation and response construction; `src/middleware/errorHandler.ts` translates domain failures to 400/409 and sanitizes unexpected failures. Parser/router error handling and headers-sent forwarding are preserved. The old middleware path re-exports the implementation for compatibility.
- No production React component exceeded 150 physical lines before refactoring. However, `BookingForm.tsx` compressed validation, state, requests, and rendering into a few long lines; `UserReservations.tsx` combined two read effects, cancellation, state, and rendering. Extracted `useBookingForm` and `useReservations`, formatted both components, and preserved cancellation recovery, independent resource-name failure handling, aborted-read guards, loading states, and conflict alerts.
- Axios error parsing was already centralized in `campushubApi.ts`; no duplicate parser was introduced.
- Resource, reservation, creation payload, and error models were duplicated across backend and client. `src/contracts/reservation.contract.ts` now owns the public declarations, imported by the frontend and re-exported by the backend's existing type path. The contract is type-only across the frontend boundary, so backend runtime dependencies do not enter the bundle. Persistence records and service interfaces remain distinct because they describe database and business-layer concerns. Removed the unused, inconsistent error interface from the health contract.

## Structured refactoring instructions applied

1. Backend: remove forwarding-only controller catches; translate known domain failures in one middleware; preserve response contracts, input validation, and safe unknown-error responses; use Express 5 rejection forwarding.
2. Frontend: move booking form state/validation/submission and reservation read/cancel workflows into custom hooks; keep API requests in the existing client; preserve UI behavior and stale-read cancellation.
3. Contracts: establish one public TypeScript declaration source consumed by both stacks; preserve create payload exclusions and separate persistence records.

## Lightweight source query

A fresh agent was restricted to these five files:

- `src/controllers/reservation.controller.ts`
- `src/middleware/errorHandler.ts`
- `client/src/hooks/useReservations.ts`
- `client/src/hooks/useBookingForm.ts`
- `src/contracts/reservation.contract.ts`

Prompt: “Where do reservation errors, frontend reservation state, and shared API types live? Answer in at most 120 words. Read only the five named source files; do not inspect dependencies, logs, maps, generated output, or other files.”

The answer identified the controllers' HTTP validation, centralized domain error handling, both state hooks, and the shared contract correctly. It referenced only source paths. Its observation about stale resource-name labels during failed refresh was addressed by clearing the supplementary resource list at refresh start.

This verifies bounded source retrieval, not a measured minimum token count. No tokenizer usage counter or comparable before/after agent run was available. Context-file bytes decreased 41%; this is a size metric, not a token-usage claim.

## Validation

- Backend type check and build passed.
- Backend tests: 9 passed, including HTTP contracts, concurrent bookings, status transitions, parser errors, safe failures, and cancellation.
- Repository ESLint passed.
- Frontend production build passed. Frontend tests: 10 passed (9 workflow tests and 1 real MongoDB/API integration test). Use the same temporary MongoDB cache environment variable for the frontend integration suite.

For backend integration tests in a restricted environment, use `MONGOMS_DOWNLOAD_DIR=/tmp/campushub-mongodb npm test` to keep downloaded MongoDB test binaries in a writable temporary cache.
