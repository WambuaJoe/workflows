# Workflow REST API — prototype

The API uses Next.js Route Handlers and standard JSON envelopes. Database credentials remain server-side.

## Configuration

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to the dedicated Workflows PostgreSQL database. The login must inherit the `workflows_app` role created by migration 002. Set `N8N_API_URL` to the n8n Public API root (including `/api/v1`), `N8N_API_KEY` to a key with workflow create/read/activate and execution read scopes, and `N8N_WEBHOOK_BASE_URL` to the public n8n base URL. Keep all credentials server-side. Do not use n8n's internal database URL and do not expose any secret through a `NEXT_PUBLIC_*` variable.

Apply migrations 001, 002 and 003 before using the API. Migration 003 makes every saved and published version snapshot immutable; corrections are new rows, never in-place edits.

## Response contract

Success:

```json
{ "ok": true, "data": { "workflow": {} } }
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Workflow document has validation errors.",
    "validationErrors": [
      {
        "nodeId": "step-3",
        "field": "kind",
        "message": "This step type is not supported.",
        "fix": "Use trigger, condition, path, or action."
      }
    ]
  }
}
```

Validation responses return all detected issues, including the node ID, field, explanation, and suggested fix.

## Endpoints

| Method | Path                            | Purpose                                                                  |
| ------ | ------------------------------- | ------------------------------------------------------------------------ |
| POST   | `/api/workflows`                | Create a workflow from a validated document                              |
| GET    | `/api/workflows/:id`            | Load the current draft                                                   |
| PUT    | `/api/workflows/:id`            | Save the draft and append a saved snapshot to version history            |
| POST   | `/api/workflows/:id/publish`    | Atomically save and publish the current document as an immutable version |
| GET    | `/api/workflows/:id/versions`   | List saved and published snapshots, newest first                         |
| POST   | `/api/workflows/:id/executions` | Create a queued test or production execution                             |
| GET    | `/api/workflows/:id/executions` | List recent executions for a workflow                                    |
| GET    | `/api/executions/:id`           | Load an execution and its step results                                   |
| POST   | `/api/executions/:id/cancel`    | Cancel a queued or running execution                                     |

Every document write validates the complete document before touching the database. Save is transactional: the current draft and its saved version snapshot commit together. Publish locks the workflow row, allocates the next version number, inserts a published snapshot and updates the current published pointer in one transaction. Publishing an unchanged current published definition is idempotent and does not create a duplicate version. Version rows cannot be updated or deleted; publish a new version to change production behavior.

## Current boundaries

- Single-user prototype; authentication and workspace isolation are not implemented.
- Test runs translate the draft snapshot; production runs translate the immutable published snapshot. The backend creates and activates an execution-scoped n8n workflow, then dispatches its production webhook. Opening an execution detail or history refreshes its n8n status and node results.
- Current supported document nodes/actions are the types in `lib/flow/types.ts`; unsupported node kinds are rejected.
- The app stores the current workflow UUID in browser localStorage. This is an identifier, not a credential.
- The database connection is server-only and uses a single connection per server process by default.
- No live database was configured or migrated by this code change.

## Execution creation

Create a draft test execution:

```http
POST /api/workflows/:id/executions
Content-Type: application/json

{ "mode": "test", "input": { "userId": "example-user" } }
```

Create a production execution from the current published version:

```http
POST /api/workflows/:id/executions
Content-Type: application/json

{ "mode": "production", "input": { "userId": "example-user" } }
```

The server snapshots the current draft for test runs and uses the database's current published version for production runs. Callers cannot submit a production definition. Production execution creation returns `409 WORKFLOW_NOT_PUBLISHED` until a version has been published. The server translates that exact snapshot, creates and activates an n8n workflow, and invokes its production webhook. Successful dispatch returns HTTP 202 with the execution and n8n workflow IDs; n8n results are synchronized when the execution detail/history is requested.

Execution input must be a JSON object no larger than 64 KB. History defaults to 20 records and accepts a maximum limit of 50. Cancellation is application-owned and only succeeds while an execution is queued or running.

**Current limitations:** the translator supports one trigger, directed links, and conditions with at most two outgoing paths. Action steps currently emit structured action descriptors inside n8n; they do not send email, message Slack, or call third-party apps because those integrations and credentials are not yet configured. A separate n8n workflow is created per execution, so cleanup/retention is a follow-up. Status synchronization is request-driven when execution detail/history is read, not a background worker. The API is still a single-user prototype without authentication; do not expose it publicly until an access gate is implemented.
