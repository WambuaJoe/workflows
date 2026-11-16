# Backend prototype

## First end-to-end milestone

The first working vertical slice is intentionally narrow:

1. Load the existing demo workflow through the Workflows backend.
2. Save the current draft to the Workflows PostgreSQL database.
3. Validate the supported workflow subset and return all detected errors.
4. Publish an immutable version.
5. Test-run a supported manual-trigger workflow with supplied JSON.
6. Have the backend invoke the generated n8n workflow through a protected webhook entry point.
7. Persist the execution status, input, structured result and node-level details.
8. Reload the page and retrieve the workflow and execution history.

The browser must never call n8n directly or receive its API key.

## Persistence model

Apply `db/migrations/001_initial_schema.sql` to a dedicated Workflows database. It must not be n8n's internal database. The databases may live on the same PostgreSQL server, but should use separate database names and database users.

- `workflows.draft_definition` is the mutable current draft JSONB document.
- A manual Save creates a `saved` immutable snapshot in `workflow_versions`.
- Publish creates a `published` immutable snapshot and updates `workflows.published_version_id`.
- A production execution references its published version.
- A draft test stores an exact `definition_snapshot`, even if no saved version exists.
- `executions` and `execution_steps` retain status and structured results. Apply the agreed 30-day execution retention policy in a later scheduled maintenance task; do not silently delete records in the request path.

The application layer must enforce version immutability and increment `version_number` transactionally.

## API contract

Use Next.js Route Handlers and REST. Responses should use a consistent envelope:

- Success: `{ "ok": true, "data": ... }`
- Error: `{ "ok": false, "error": { "code": "...", "message": "...", "details": [...] } }`

Validation should collect all detected errors and identify the affected node/field. Keep validation errors distinct from n8n transport errors and workflow execution failures.

Initial routes:

- `GET /api/workflows/demo` — load the prototype workflow.
- `PUT /api/workflows/demo/draft` — save the current draft.
- `POST /api/workflows/demo/validate` — validate a definition.
- `POST /api/workflows/demo/versions` — create a manual-save snapshot.
- `POST /api/workflows/demo/publish` — publish a validated immutable version.
- `POST /api/workflows/demo/test-runs` — start a test using supplied JSON.
- `GET /api/executions` — list recent executions.
- `GET /api/executions/:id` — inspect an execution and its node results.

These are the first prototype contract, not a commitment to expose every future product operation.

## Environment configuration

Server-only environment variables (never prefix these with `NEXT_PUBLIC_`):

- `DATABASE_URL` — connection string for the dedicated Workflows database.
- `N8N_BASE_URL` — HTTPS base URL of the existing n8n instance.
- `N8N_API_KEY` — n8n API key, used only by server-side code.
- `N8N_MANUAL_WEBHOOK_SECRET` — high-entropy secret used to protect the app-managed manual execution webhook.

Do not commit real values. Add local values to `.env.local` and production values to the deployment's secret environment.

## n8n execution boundary

The product's Manual Trigger is translated to a protected app-managed webhook entry point. The Workflows backend sends the test input to that entry point. This avoids relying on an undocumented REST operation to start a native n8n Manual Trigger.

Before implementing the adapter, verify the installed n8n version and test workflow creation, activation, webhook execution and execution retrieval against a disposable workflow. Never alter existing production workflows during adapter verification.

## Scope exclusions for this milestone

No authentication rollout, OAuth integrations, broad node catalogue, webhook/schedule triggers from external users, branching, loops, queue infrastructure, Redis, multi-worker deployment, or VPS reconfiguration. Those are separate increments after the first vertical slice works.
