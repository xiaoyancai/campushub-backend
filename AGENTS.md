# CampusHub AI Development Rules

These instructions apply to the entire repository. Follow them for every AI-generated or AI-modified change unless the user gives a more specific instruction that does not conflict with course or security requirements.

## Authorized stack and scope

- Build application code with Node.js, TypeScript, Express, and Mongoose.
- Write application source in TypeScript. Do not create handwritten JavaScript source files; JavaScript emitted by the TypeScript compiler belongs only in ignored build output such as `dist/`.
- Do not add runtime libraries outside the authorized stack without explicit user approval. Prefer the standard library and existing dependencies. Development-only tooling also requires a clear need and must not change the application architecture.
- Preserve the repository's strict TypeScript configuration. Do not weaken compiler checks to make code compile.
- Implement only the requested scope. Do not generate scaffolding, endpoints, servers, or infrastructure preemptively.

## Separation of concerns

Keep the request flow strictly layered: **route -> controller -> service -> model**.

### Routes

- Define endpoint paths, HTTP methods, and middleware/controller mappings only.
- Do not contain business logic, database access, response construction, or status-code decisions.

### Controllers

- Handle the HTTP boundary: read and validate typed request data, invoke services, and send responses with appropriate HTTP status codes.
- Do not import Mongoose models or execute database queries directly.
- Keep business rules and persistence logic out of controllers.

### Services

- Implement business rules, orchestration, and tenant-aware authorization or scoping.
- Perform all database operations through models.
- Do not depend on Express request or response objects, and do not choose HTTP status codes.
- Never trust a client-supplied tenant identifier without validating it against the authenticated tenant context. Every tenant-owned query and mutation must be scoped to the correct tenant.

### Models

- Contain only Mongoose schemas/models and the TypeScript interfaces or types that describe persisted data.
- Do not contain HTTP handling, routing, or service-level business workflows.
- Define tenant ownership explicitly for tenant-scoped data and support enforcing tenant isolation in service queries.

## TypeScript and API contracts

- Use strict, explicit TypeScript types for function inputs, outputs, requests, responses, service contracts, and persisted documents.
- Define named interfaces or types for API request/response contracts and database schemas. Do not rely on inferred object shapes at architectural boundaries.
- Do not use `any`, implicit `any`, unsafe casts, or non-null assertions to bypass type safety. Use `unknown` for untrusted values and narrow it safely.
- Keep API contracts separate from persistence types when their shapes or responsibilities differ. Do not expose Mongoose documents directly as API responses.
- Validate and normalize untrusted input at the application boundary before passing it to services.

## Asynchronous code and errors

- Await or deliberately return every promise. Do not leave floating promises or create unhandled promise rejections.
- Propagate errors through a consistent async controller/error-middleware path; do not silently swallow failures.
- Use `try`/`catch` only when adding useful context, translating a known error, or performing cleanup. Preserve the original cause when wrapping errors.
- Services should report typed or well-defined domain failures; controllers or centralized error middleware translate them into safe HTTP responses.
- Do not expose stack traces, database details, secrets, or internal error objects to clients.

## Security and repository hygiene

- Never commit secrets, credentials, tokens, private keys, connection strings, or real environment values.
- Never commit `.env`, `.env.*` (except a sanitized `.env.example`), `node_modules/`, or `dist/`. Keep these patterns in `.gitignore`.
- Use environment variables for configuration and fail clearly when required configuration is missing. Examples must contain placeholders only.
- Treat all request data as untrusted. Enforce tenant isolation, validate identifiers, and avoid leaking one tenant's data to another.
- Do not log secrets, authentication data, or sensitive personal information.
- Do not introduce a dependency merely for convenience. Before any approved dependency change, consider security, maintenance, and whether existing code or Node.js can provide the capability.

## Verification and change summaries

- Before completing a change, run the relevant TypeScript checks and tests available in the repository. Never claim a check passed unless it was run successfully.
- Keep changes focused and do not modify unrelated files.
- End each completed task with a concise summary stating what was built or changed, why it was needed, which of these repository rules shaped the implementation, and what verification was performed.
- Call out any assumptions, missing tests, or checks that could not be run.
