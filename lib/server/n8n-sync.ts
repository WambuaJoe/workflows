import { requireDb } from "./db";
import { getExecution, listWorkflowExecutions } from "./n8n-client";

type RunData = Record<string, Array<{
  data?: { main?: Array<Array<{ json?: unknown }>> };
  error?: unknown;
}>>;

function terminalStatus(status?: string) {
  if (status === "success") return "succeeded" as const;
  if (status === "error" || status === "crashed") return "failed" as const;
  return null;
}

export async function syncN8nExecution(executionId: string) {
  const db = requireDb();
  const [record] = await db`
    SELECT id, status, n8n_workflow_id AS "n8nWorkflowId",
           n8n_execution_id AS "n8nExecutionId", definition_snapshot AS "definitionSnapshot"
    FROM public.executions
    WHERE id = ${executionId}::uuid
  `;
  if (!record || !record.n8nWorkflowId || ["succeeded", "failed", "cancelled"].includes(record.status)) {
    return;
  }

  const summary = record.n8nExecutionId
    ? null
    : await listWorkflowExecutions(record.n8nWorkflowId);
  const n8nExecutionId = record.n8nExecutionId ?? summary?.id;
  if (!n8nExecutionId) return;

  const detail = await getExecution(n8nExecutionId);
  const n8nStatus = detail.status ?? summary?.status ?? (detail.finished ? "success" : undefined);
  const finishedStatus = terminalStatus(n8nStatus);
  const runData = detail.data?.resultData?.runData ?? {};

  await db`
    UPDATE public.executions
    SET n8n_execution_id = ${n8nExecutionId}
    WHERE id = ${executionId}::uuid
  `;

  if (record.status === "queued" && (n8nStatus === "running" || finishedStatus)) {
    await db`
      SELECT * FROM integration.v1_update_execution_status(
        ${executionId}::uuid, 'running', ${n8nExecutionId}, NULL, NULL
      )
    `;
  }

  const snapshot = record.definitionSnapshot as { steps?: Array<{ id: string; label: string; kind: string }> } | null;
  const steps = snapshot?.steps ?? [];
  for (const [nodeName, runs] of Object.entries(runData)) {
    const match = nodeName.match(/^(\d+) /);
    const step = match ? steps[Number(match[1]) - 1] : undefined;
    if (!step || !runs.length) continue;
    const latest = runs[runs.length - 1];
    const failed = Boolean(latest.error);
    const output = latest.data?.main?.flat().map((item) => item.json ?? null) ?? [];
    await db`
      SELECT * FROM integration.v1_record_execution_step(
        ${executionId}::uuid,
        ${step.id},
        ${step.kind},
        ${step.label},
        ${failed ? "failed" : "succeeded"},
        NULL,
        ${JSON.stringify(output)}::jsonb,
        ${failed ? JSON.stringify(latest.error) : null}::jsonb
      )
    `;
  }

  if (finishedStatus) {
    const lastOutput = Object.values(runData).at(-1)?.at(-1)?.data?.main?.flat().map((item) => item.json ?? null) ?? [];
    const error = detail.data?.resultData?.error ?? null;
    await db`
      SELECT * FROM integration.v1_update_execution_status(
        ${executionId}::uuid,
        ${finishedStatus},
        ${n8nExecutionId},
        ${finishedStatus === "succeeded" ? JSON.stringify(lastOutput) : null}::jsonb,
        ${finishedStatus === "failed" ? JSON.stringify(error) : null}::jsonb
      )
    `;
  }
}
