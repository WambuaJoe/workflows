# PostgreSQL integration contract

## Purpose and decisions

The Workflows database is separate from n8n's internal database. Next.js remains the application control plane; n8n executes automation and reports progress. Consumers use a stable interface in the \`integration\` schema rather than depending on internal application tables.

- Access model: hybrid.
- Read interface: versioned views.
- Write interface: versioned PostgreSQL functions.
- n8n can read workflow drafts and published versions through separate views.
- Next.js creates/cancels executions and polls n8n's Public API to synchronize running/terminal status and node results. The database functions remain the versioned write contract for a future direct n8n database integration; the current adapter does not give n8n database credentials.
- n8n may read business data only through explicitly approved views. The current prototype schema has no business-domain tables, so no generic business-data view is created yet. Add a narrowly scoped view when a concrete business-data source is identified.
- n8n receives no direct privileges on application tables.

## Views

| Object                                 | Purpose                                |
| -------------------------------------- | -------------------------------------- |
| \`integration.v1_workflows\`           | Workflow metadata                      |
| \`integration.v1_drafts\`              | Current mutable draft definition       |
| \`integration.v1_published_workflows\` | Current published immutable definition |
| \`integration.v1_execution_history\`   | Execution summaries and results        |
| \`integration.v1_execution_steps\`     | Node-level execution details           |

Production execution must use the current published version. The start function retrieves that definition from the database instead of trusting a caller-supplied production snapshot. Draft test runs preserve the exact supplied snapshot.

## Functions

| Function                                   | Caller                      | Purpose                                                                             |
| ------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------- |
| \`integration.v1_start_execution\`         | Next.js / \`workflows_app\` | Create queued execution; production definition comes from current published version |
| \`integration.v1_update_execution_status\` | n8n / \`workflows_n8n\`     | Report running, succeeded or failed                                                 |
| \`integration.v1_record_execution_step\`   | n8n / \`workflows_n8n\`     | Record node progress and results                                                    |
| \`integration.v1_cancel_execution\`        | Next.js / \`workflows_app\` | Cancel queued or running execution                                                  |

n8n cannot create/cancel executions, alter workflow definitions, or publish versions.

## Execution status ownership

| Operation                    | Owner                            |
| ---------------------------- | -------------------------------- |
| Create queued execution      | Next.js                          |
| Observe and persist running    | Next.js n8n API adapter          |
| Persist node progress/results | Next.js n8n API adapter          |
| Persist succeeded/failed      | Next.js n8n API adapter          |
| Request cancellation         | Next.js                          |
| Timeout/reconciliation       | Next.js (follow-up backend work) |
| Display status/history       | Next.js                          |

Allowed integration-function transitions: queued to running or failed; running to succeeded or failed. Repeating the current status is idempotent and does not overwrite terminal results. The current adapter calls these functions from Next.js after reading n8n execution data; n8n cannot set cancelled.

## Roles and credentials

Migration 002 creates two NOLOGIN group roles:

- \`workflows_app\`: application data access and application-owned execution functions.
- \`workflows_n8n\`: approved integration views and n8n-owned reporting functions.

Create separate login roles through the database secret-management process and grant membership. Example, using operator-created login role names:

\`\`\`sql
GRANT workflows_app TO workflows_app_login;
GRANT workflows_n8n TO n8n_login;
\`\`\`

Do not store passwords in migrations or source control, and never reuse n8n's internal database credentials.

Run migration 002 as the owner of the application tables. Its narrowly scoped SECURITY DEFINER functions fix search_path, schema-qualify application tables, revoke default PUBLIC execution, and grant execution only to intended roles. Review pre-existing PUBLIC grants on application tables before enabling n8n; the dedicated database should not have broad PUBLIC table grants.

## Apply and verify

Apply to the dedicated Workflows database, never n8n's internal database:

\`\`\`bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/002_integration_contract.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/002_integration_contract_permissions.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/003_immutable_workflow_versions.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/004_immutable_workflow_versions.sql
\`\`\`

The permission test is run before migration 003 because it deliberately cleans up fixture version rows. Migration 003 then makes all historical version rows immutable. The commands are operator instructions. Committing these files does not apply them to a live database or configure n8n.

## Scope

Prototype essentials: initial schema, integration schema/views/functions, separate least-privilege roles, permission smoke test, Next.js execution-record APIs, then n8n translation/dispatch and request-driven status synchronization.

Deferred: concrete business-data views until a source is identified, automated compatibility testing, contract deprecation tooling, advanced reconciliation/monitoring, and scheduled 30-day retention cleanup.

The current schema is a single-user prototype. Multi-user row isolation is not included in this milestone. The Next.js execution API currently creates, reads and cancels database records; queued executions are not dispatched to n8n until the adapter and translator are implemented.
