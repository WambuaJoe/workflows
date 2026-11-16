import { INITIAL_DOC, type Doc } from "@/lib/flow";
import { getDatabase } from "@/lib/server/db";
import { validateWorkflowDefinition } from "@/lib/server/workflow-validation";

export const runtime = "nodejs";

const DEMO_WORKFLOW_ID = "00000000-0000-4000-8000-000000000001";

function success<T>(data: T, status = 200) {
  return Response.json({ ok: true, data }, { status });
}

function failure(code: string, message: string, status: number, details: unknown[] = []) {
  return Response.json({ ok: false, error: { code, message, details } }, { status });
}

async function ensureDemoWorkflow() {
  const sql = getDatabase();
  const rows = await sql`
    INSERT INTO workflows (id, name, draft_definition)
    VALUES (${DEMO_WORKFLOW_ID}, ${INITIAL_DOC.name}, ${sql.json(INITIAL_DOC)})
    ON CONFLICT (id) DO NOTHING
    RETURNING id, name, draft_definition, draft_updated_at, published_version_id
  `;

  if (rows[0]) return rows[0];

  const existing = await sql`
    SELECT id, name, draft_definition, draft_updated_at, published_version_id
    FROM workflows WHERE id = ${DEMO_WORKFLOW_ID}
  `;
  return existing[0];
}

export async function GET() {
  try {
    const workflow = await ensureDemoWorkflow();
    return success({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        definition: workflow.draft_definition,
        updatedAt: workflow.draft_updated_at,
        publishedVersionId: workflow.published_version_id,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the workflow.";
    return failure("workflow_load_failed", message, 503);
  }
}

export async function PUT(request: Request) {
  let body: { definition?: unknown; createVersion?: boolean };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return failure("invalid_json", "Request body must be a JSON object.", 400);
    }
    body = parsed as { definition?: unknown; createVersion?: boolean };
  } catch {
    return failure("invalid_json", "Request body must contain valid JSON.", 400);
  }

  const definition = body.definition;
  const validationErrors = validateWorkflowDefinition(definition);
  if (validationErrors.length) {
    return failure("validation_failed", "Fix the workflow validation errors before saving.", 422, validationErrors);
  }

  const doc = definition as Doc;

  try {
    const sql = getDatabase();
    const result = await sql.begin(async (tx) => {
      const existing = await tx`
        SELECT id FROM workflows WHERE id = ${DEMO_WORKFLOW_ID} FOR UPDATE
      `;

      if (!existing[0]) {
        await tx`
          INSERT INTO workflows (id, name, draft_definition)
          VALUES (${DEMO_WORKFLOW_ID}, ${doc.name}, ${tx.json(doc)})
        `;
      } else {
        await tx`
          UPDATE workflows
          SET name = ${doc.name},
              draft_definition = ${tx.json(doc)},
              draft_updated_at = now(),
              updated_at = now()
          WHERE id = ${DEMO_WORKFLOW_ID}
        `;
      }

      let version = null;
      if (body.createVersion) {
        const next = await tx`
          SELECT COALESCE(MAX(version_number), 0) + 1 AS version_number
          FROM workflow_versions WHERE workflow_id = ${DEMO_WORKFLOW_ID}
        `;
        const inserted = await tx`
          INSERT INTO workflow_versions (workflow_id, version_number, version_kind, definition)
          VALUES (${DEMO_WORKFLOW_ID}, ${next[0].version_number}, 'saved', ${tx.json(doc)})
          RETURNING id, version_number, created_at
        `;
        version = inserted[0];
      }

      const saved = await tx`
        SELECT id, name, draft_updated_at, published_version_id
        FROM workflows WHERE id = ${DEMO_WORKFLOW_ID}
      `;

      return { workflow: saved[0], version };
    });

    return success({
      workflow: {
        id: result.workflow.id,
        name: result.workflow.name,
        updatedAt: result.workflow.draft_updated_at,
        publishedVersionId: result.workflow.published_version_id,
      },
      version: result.version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the workflow.";
    return failure("workflow_save_failed", message, 503);
  }
}
