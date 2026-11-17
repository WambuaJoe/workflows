# Workflow REST API — prototype

The API uses Next.js Route Handlers and standard JSON envelopes. Database credentials remain server-side.

## Configuration

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to the dedicated Workflows PostgreSQL database. The login must inherit the `workflows_app` role created by migration 002. Do not use n8n's internal database URL and do not expose the connection string through a `NEXT_PUBLIC_*` variable.

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

| Method | Path                          | Purpose                                                                  |
| ------ | ----------------------------- | ------------------------------------------------------------------------ |
| POST   | `/api/workflows`              | Create a workflow from a validated document                              |
| GET    | `/api/workflows/:id`          | Load the current draft                                                   |
| PUT    | `/api/workflows/:id`          | Save the draft and append a saved snapshot to version history            |
| POST   | `/api/workflows/:id/publish`  | Atomically save and publish the current document as an immutable version |
| GET    | `/api/workflows/:id/versions` | List saved and published snapshots, newest first                         |
| POST   | `/api/workflows/:id/executions` | Create a queued test or production execution                              |
| GET    | `/api/workflows/:id/executions` | List recent executions for a workflow                                     |
| GET    | `/api/executions/:id`        | Load an execution and its step results                                    |
| POST   | `/api/executions/:id/cancel` | Cancel a queued or running execution                                      |

Every document write validates the complete document before touching the database. Save is transactional: the current draft and its saved version snapshot commit together. Publish locks the workflow row, allocates the next version number, inserts a published snapshot and updates the current published pointer in one transaction. Publishing an unchanged current published definition is idempotent and does not create a duplicate version. Version rows cannot be updated or deleted; publish a new version to change production behavior.

## Current boundaries

- Single-user prototype; authentication and workspace isolation are not implemented.
- Execution records can now be created, listed, inspected and cancelled through the API. Creating a record does not yet dispatch it to n8n; the n8n translator/dispatcher and status poller are the next implementation slice.
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

The server snapshots the current draft for test runs and uses the database's current published version for production runs. Callers cannot submit a production definition. Production execution creation returns `409 WORKFLOW_NOT_PUBLISHED` until a version has been published. Successful creation returns HTTP 202 with a queued execution ID.

Execution input must be a JSON object no larger than 64 KB. History defaults to 20 records and accepts a maximum limit of 50. Cancellation is application-owned and only succeeds while an execution is queued or running.

**Current limitation:** this API milestone persists the execution lifecycle record. It does not yet call n8n or transition queued records to running. Do not treat a queued record as dispatched until the n8n adapter milestone is complete.
