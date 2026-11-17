import { NextRequest } from "next/server";
import { failure, success } from "@/lib/server/api-response";
import { requireDb } from "@/lib/server/db";
import { syncN8nExecution } from "@/lib/server/n8n-sync";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return failure(400, "INVALID_EXECUTION_ID", "Execution ID must be a UUID.");
  }

  try {
    const db = requireDb();
    await syncN8nExecution(id);
    const [execution] = await db`
      SELECT id, workflow_id AS "workflowId",
             workflow_version_id AS "workflowVersionId",
             execution_mode AS mode, status, definition_snapshot AS "definitionSnapshot",
             input, output, error,
             n8n_workflow_id AS "n8nWorkflowId",
             n8n_execution_id AS "n8nExecutionId",
             started_at AS "startedAt", completed_at AS "completedAt",
             created_at AS "createdAt"
      FROM public.executions
      WHERE id = ${id}::uuid
    `;

    if (!execution) return failure(404, "EXECUTION_NOT_FOUND", "Execution was not found.");

    const steps = await db`
      SELECT id, node_id AS "nodeId", node_type AS "nodeType",
             node_label AS "nodeLabel", status, input, output, error,
             started_at AS "startedAt", completed_at AS "completedAt",
             created_at AS "createdAt"
      FROM public.execution_steps
      WHERE execution_id = ${id}::uuid
      ORDER BY created_at ASC
    `;

    return success({ execution, steps });
  } catch (error) {
    console.error("Execution detail load failed:", error);
    return failure(
      503,
      "EXECUTION_STORAGE_UNAVAILABLE",
      "Could not load execution details. Check the database connection.",
    );
  }
}
