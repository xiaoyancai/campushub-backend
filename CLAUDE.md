# CampusHub project context

Follow AGENTS.md for repository-wide rules. Backend architecture rules apply to src/; client/ uses React, TypeScript, Vite, Axios and CSS Modules.

## Frontend guidelines

- Use functional React components only, with explicit named props interfaces for components that accept props.
- Manage state with standard React hooks (useState, useEffect) or custom hooks.
- Keep API calls in client/src/api/campushubApi.ts, invoked from effects and event handlers, never directly during JSX rendering.
- Use modular, consistent CSS Modules with responsive layouts and accessible form/error states.
- Match docs/openapi.yaml: use public id fields, ISO timestamps with timezones and server-managed reservation statuses. DELETE returns 204 with no body.
- Every asynchronous workflow must expose loading/error states, restore controls on failure, prevent duplicate submissions and ignore aborted/stale reads.
- Show explicit 409 reservation conflicts. Do not equate failed loading with an empty list. Resource names are supplementary and must not block reservation management.
