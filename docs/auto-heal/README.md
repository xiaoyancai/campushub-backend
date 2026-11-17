# CampusHub CI Auto-Healing Implementation

This work implements a CI workflow, a constrained AI repair runner, repair publication logic, and local validation for Jest failures in CampusHub. The workflow collects failure evidence, supplies logs and source context to a model, validates the proposed edits, and runs the full verification sequence before allowing repair publication.

## 1. Continuous Integration

The workflow in `.github/workflows/ci.yml` handles pushes to `main` and pull requests targeting `main`. It uses Node.js 24 and installs both backend and frontend dependencies with `npm ci`, since the existing lint command relies on the client ESLint toolchain.

The baseline job runs ESLint, backend TypeScript checks, separate TypeScript checks for the repair tools, six isolated repair-runner tests, and the complete Jest suite.

Jest output is captured in `test-results.log`. The shell uses `pipefail` to preserve the test command's failing exit status while piping its output through `tee`. The log is uploaded as an artifact so the repair job can inspect the failure. The original test job retains its failed status independently of any subsequent repair.

## 2. Conditional Repair Job

The `auto-fix` job depends on the baseline job and combines `failure()` with the actual Jest step outcome. This limits repair attempts to Jest failures; dependency installation, lint, and typecheck failures do not invoke the model.

Repair runs are restricted to main-branch pushes and pull requests from the same repository. Fork pull requests are excluded from the secret-bearing repair job. Pull request branches beginning with `fix/auto-heal-` are also excluded to prevent recursive repair attempts.

The baseline job has read access to repository contents. The repair job has content and pull request write permissions. Checkout does not persist Git credentials, and the publication token is supplied only to the publication step.

## 3. AI Diagnosis and Constrained Source Edits

The runner in `tools/auto-heal/runner.ts` uses Node.js native `fetch` to call a configurable model endpoint without adding runtime dependencies. Its context includes the Jest failure log, source diff, eligible production files, and existing tests as read-only reference material.

The model instruction asks for a diagnosis and minimal edits to the source responsible for the failure. Each proposed edit contains a file path, an exact source fragment, and replacement text in a structured JSON response.

The runner enforces the following constraints:

- Only existing Git-tracked TypeScript production files under `src/services/`, `src/controllers/`, `src/models/`, and `src/routes/` are eligible.
- Test files and test directories are excluded to protect existing assertions.
- A response can contain at most five edits, and each source fragment must match exactly once.
- Empty edits, disallowed paths, missing matches, and ambiguous matches are rejected.
- Every edit is validated before any file is written, preventing partial changes when a later edit fails validation.

Model output is processed as data rather than executed as shell commands. The runner saves the diagnosis and edit proposal in `proposal.json` and records the resulting patch in `fix.diff` for review.

## 4. Patch Verification and PR Publication Logic

After applying a proposed patch, the workflow reruns lint, backend and repair-tool typechecks, the full Jest suite, and `git diff --check`. Publication is placed after these checks so it can proceed only when verification succeeds.

The publication script in `tools/auto-heal/publish.ts` implements the following behavior:

- Derive a stable repair branch name from the original pull request number or failing main-branch commit SHA.
- Search pull requests in all states for that repair branch to prevent duplicate repair PRs on reruns.
- Confirm that the source branch still points to the tested commit before publishing.
- Recheck the modified file paths and commit only eligible production-source changes.
- Create a draft repair PR targeting the original failing branch, with a link to the verification workflow run.

The PR description template includes a human-review checklist for the root cause, source diff, unchanged test assertions, verification logs, and reviewer findings. The workflow also preserves the proposal, patch, and verification log as audit artifacts.

## 5. Fault Injection and Local Validation

The patch in `docs/auto-heal/break-reservation.patch` changes the reservation guard from `if (overlap)` to `if (!overlap)`. This sends otherwise valid reservations into the conflict branch and provides a reproducible business-logic regression.

During local validation, the patch was temporarily applied and the full Jest suite was run. The source was then restored and the suite was run again.

| Stage | Result | Observation |
|---|---|---|
| Original source | 55 tests passed | Established the baseline |
| Inverted reservation guard | 12 failed, 43 passed | Existing tests detected the regression |
| Restored source | 55 tests passed | Confirmed recovery after fault injection |

The demonstration reused existing tests covering valid bookings, overlapping intervals, adjacent intervals, and concurrent reservations.

## 6. Isolated Repair-Runner Tests

| Scenario | Behavior verified |
|---|---|
| Valid source edit | Applies a uniquely matched edit and records patch evidence |
| Test-file modification | Rejects changes to test code |
| Path traversal | Rejects paths outside the allowed source files |
| Missing source match | Rejects edits that cannot be located precisely |
| Invalid edit within a batch | Rejects the batch before writing any file |
| No proposed repair | Fails explicitly and preserves the source |

The separate `tools/auto-heal/tsconfig.json` inherits the repository's strict TypeScript settings and enables independent typechecking of the repair tools.
