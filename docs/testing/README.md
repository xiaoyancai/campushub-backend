# Automated testing

Run `npm ci`, then:

```sh
npm test
npm run test:coverage
npm run test:legacy
npm run typecheck
npx tsc --noEmit -p tsconfig.test.json
npm run lint
```

For the lab's direct Jest command in this ESM repository:

```sh
NODE_OPTIONS=--experimental-vm-modules npx jest --coverage
```

Jest uses ts-jest with strict TypeScript settings. TypeScript 6 is used because ts-jest's peer dependency currently excludes TypeScript 7. Application architecture and strict compiler checks are unchanged.

`src/test/setup.ts` starts a disposable single-node MongoDB replica set, initializes indexes, clears both collections before each test, and disconnects/stops the database afterward. A replica set is required for the real reservation transactions and concurrency checks. No external MongoDB URI is read. Binaries are cached under ignored `node_modules/.cache/mongodb-binaries`; first use needs a download. Each test file has its own database.

Service tests exercise real database operations rather than mocking transactions. Resource creation is tested through the existing idempotent seed service; this API has no resource-creation endpoint. Supertest exercises the Express application through its HTTP boundary.

Coverage includes every production file in `src/services/` and `src/controllers/`, including files not imported by tests. HTML/LCOV reports are regenerated in ignored `coverage/`; the JSON summary beside this document records the verified submission result.

## Verified result

- 2 Jest suites, 55 tests passed.
- Services: 100% statements, 100% branches.
- Controllers: 96.49% statements, 88.67% branches.
- Combined: 97.97% statements, 92.10% branches.

Cases include exact duplicates, 1 ms overlaps on either boundary, containment, timezone-equivalent overlaps, adjacent slots, invalid dates, missing payload fields, zero/negative ranges, unavailable/missing resources, cancellation and confirmation transitions, student history, resource filters, and concurrent bookings. Concurrent tests assert exactly one winner and exactly one persisted reservation.

Remaining controller branches primarily guard absent route parameters that Express's registered routes do not supply, and the defensive blank-user branch. They remain visible in the coverage report.
