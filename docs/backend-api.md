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

Every document write validates the complete document before touching the database. Save is transactional: the current draft and its saved version snapshot commit together. Publish locks the workflow row, allocates the next version number, inserts a published snapshot and updates the current published pointer in one transaction. Publishing an unchanged current published definition is idempotent and does not create a duplicate version. Version rows cannot be updated or deleted; publish a new version to change production behavior.

## Current boundaries

- Single-user prototype; authentication and workspace isolation are not implemented.
- Publishing and version history are implemented. Starting n8n executions and the n8n adapter are the next milestone.
- Current supported document nodes/actions are the types in `lib/flow/types.ts`; unsupported node kinds are rejected.
- The app stores the current workflow UUID in browser localStorage. This is an identifier, not a credential.
- The database connection is server-only and uses a single connection per server process by default.
- No live database was configured or migrated by this code change.
