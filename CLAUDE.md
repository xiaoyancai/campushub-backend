# CampusHub project context

Follow AGENTS.md for stack, architecture, security, and frontend requirements.

Default discovery and lightweight queries to `src/` and `client/src/`.
Read tests, configuration, and `docs/openapi.yaml` only when needed for the task.
Do not process historical logs, generated API output, dependency trees, builds,
coverage reports, or bundle/source maps. See `.cursorignore` for exclusions.

Backend Express 5 forwards thrown errors and rejected controller promises to
`src/middleware/errorHandler.ts`. Shared public API types live in
`src/contracts/reservation.contract.ts`; persistence models remain separate.
