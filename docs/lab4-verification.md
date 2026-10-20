# Lab 4 verification

Executed curl requests against the real Express app on port 3187 with a freshly seeded, isolated MongoDB replica set. No production data was used.

| Check                | Request                                                            | Observed status |
| -------------------- | ------------------------------------------------------------------ | --------------- |
| All resources        | GET `/resources`                                                   | 200             |
| Type filter          | GET `/resources?type=ROOM`                                         | 200             |
| Invalid type         | GET `/resources?type=`                                             | 400             |
| Available rooms      | GET `/resources?type=ROOM&isAvailable=true`                        | 200             |
| Unavailable rooms    | GET `/resources?type=ROOM&isAvailable=false`                       | 200             |
| Invalid availability | GET `/resources?isAvailable=yes`                                   | 400             |
| Create               | POST `/reservations`                                               | 201             |
| Duplicate            | POST `/reservations`                                               | 409             |
| History              | GET `/reservations/user/manual-user`                               | 200             |
| Invalid body         | POST `/reservations`                                               | 400             |
| Confirm              | PATCH `/reservations/92b32fa5-a582-42a4-abb4-04653737274a/confirm` | 200             |
| Cancel               | PATCH `/reservations/92b32fa5-a582-42a4-abb4-04653737274a/cancel`  | 204             |
| Repeat cancel        | PATCH `/reservations/92b32fa5-a582-42a4-abb4-04653737274a/cancel`  | 204             |
| Cancelled retained   | GET `/reservations/user/manual-user`                               | 200             |
| Reuse slot           | POST `/reservations`                                               | 201             |
| Cannot reactivate    | PATCH `/reservations/92b32fa5-a582-42a4-abb4-04653737274a/confirm` | 409             |
| Missing cancellation | PATCH `/reservations/missing/cancel`                               | 404             |
| Legacy cancellation  | DELETE `/reservations/92b32fa5-a582-42a4-abb4-04653737274a`        | 204             |

Automated checks: `npm run typecheck`, `npm run build`, and `npm test`. The suite covers containment and partial overlaps, timezone equivalence, adjacent slots, PENDING blocking, concurrency across app instances, persistence, cancellation, full history, validation, and sanitized HTTP 500 responses using an injected database failure.
