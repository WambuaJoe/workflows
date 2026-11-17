import { NextRequest } from "next/server";
import { failure, success } from "@/lib/server/api-response";
import { requireDb } from "@/lib/server/db";
import { createAndActivateWorkflow, dispatchWebhook } from "@/lib/server/n8n-client";
import { translateWorkflow } from "@/lib/server/n8n-workflow";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_INPUT_BYTES = 64_000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type RouteContext = { params: Promise<{ id: string }> };
type ExecutionMode = "test" | "production";
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return failure(400, "INVALID_WORKFLOW_ID", "Workflow ID must be a UUID.");
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_INPUT_BYTES) {
      return failure(413, "PAYLOAD_TOO_LARGE", "Execution input exceeds the 64 KB limit.");
    }
    body = JSON.parse(text);
  } catch {
    return failure(400, "INVALID_JSON", "Request body must contain valid JSON.");
  }

  if (!isRecord(body) || (body.mode !== "test" && body.mode !== "production")) {
    return failure(400, "INVALID_EXECUTION_MODE", "Mode must be test or production.");
  }

  const mode = body.mode as ExecutionMode;
  const inputValue: unknown = body.input === undefined ? {} : body.input;
  if (!isJsonObject(inputValue)) {
    return failure(422, "INVALID_EXECUTION_INPUT", "Execution input must be a JSON object.");
  }

  const input = inputValue as JsonObject;

  try {
    const db = requireDb();
    const outcome = await db.begin(async (tx) => {
      const [workflow] = await tx`
        SELECT w.id, w.draft_definition, w.published_version_id,
               v.definition AS published_definition
        FROM public.workflows AS w
        LEFT JOIN public.workflow_versions AS v
          ON v.id = w.published_version_id AND v.workflow_id = w.id
        WHERE w.id = ${id}::uuid
        FOR SHARE
      `;

      if (!workflow) return { kind: "missing" as const };
      if (mode === "production" && !workflow.published_version_id) {
        return { kind: "unpublished" as const };
      }

      const [createdRecord] = mode === "production"
        ? await tx`
            SELECT execution_id AS id, status, created_at AS "createdAt"
            FROM integration.v1_start_execution(
              ${id}::uuid,
              'production',
              ${tx.json(input)},
              ${workflow.published_version_id}::uuid,
              NULL
            )
          `
        : await tx`
            SELECT execution_id AS id, status, created_at AS "createdAt"
            FROM integration.v1_start_execution(
              ${id}::uuid,
              'test',
              ${tx.json(input)},
              NULL,
              ${tx.json(workflow.draft_definition)}
            )
          `;

      return {
        kind: "created" as const,
        execution: createdRecord,
        definition: mode === "production" ? workflow.published_definition : workflow.draft_definition,
      };
    });

    if (outcome.kind === "missing") {
      return failure(404, "WORKFLOW_NOT_FOUND", "Workflow was not found.");
    }
    if (outcome.kind === "unpublished") {
      return failure(409, "WORKFLOW_NOT_PUBLISHED", "Publish this workflow before starting a production execution.");
    }

    try {
      const executionId = String(outcome.execution.id);
      const definition = outcome.definition as unknown as import("@/lib/flow").Doc;
      const translated = translateWorkflow(definition, executionId);
      const n8nWorkflowId = await createAndActivateWorkflow(translated);
      await db.unsafe("UPDATE public.executions SET n8n_workflow_id = $1 WHERE id = $2::uuid", [n8nWorkflowId, executionId]);
      await dispatchWebhook("workflows/" + executionId, { executionId, mode, input });
      return success({ execution: { ...outcome.execution, n8nWorkflowId } }, 202);
    } catch (dispatchError) {
      console.error("Workflow dispatch failed:", dispatchError);
      await db.unsafe("SELECT * FROM integration.v1_update_execution_status($1::uuid, 'failed', NULL, NULL, $2::jsonb)", [
        outcome.execution.id,
        JSON.stringify({ code: "N8N_DISPATCH_FAILED", message: dispatchError instanceof Error ? dispatchError.message : "Could not dispatch execution to n8n." }),
      ]);
      return failure(502, "N8N_DISPATCH_FAILED", "The execution record was created, but n8n could not be started. Check the n8n connection and API key.");
    }
  } catch (error) {
    console.error("Workflow execution creation failed:", error);
    return failure(
      503,
      "EXECUTION_STORAGE_UNAVAILABLE",
      "Could not create the execution record. Check the database connection.",
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return failure(400, "INVALID_WORKFLOW_ID", "Workflow ID must be a UUID.");
  }

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT);
  if (!Number.isInteger(rawLimit) || rawLimit < 1) {
    return failure(400, "INVALID_LIMIT", "Limit must be a whole number between 1 and 50.");
  }
  const limit = Math.min(rawLimit, MAX_LIMIT);

  try {
    const db = requireDb();
    const [workflow] = await db`
      SELECT id FROM public.workflows WHERE id = ${id}::uuid
    `;
    if (!workflow) return failure(404, "WORKFLOW_NOT_FOUND", "Workflow was not found.");

    const executions = await db`
      SELECT id, workflow_version_id AS "workflowVersionId",
             execution_mode AS mode, status, input, output, error,
             n8n_workflow_id AS "n8nWorkflowId",
             n8n_execution_id AS "n8nExecutionId",
             started_at AS "startedAt", completed_at AS "completedAt",
             created_at AS "createdAt"
      FROM public.executions
      WHERE workflow_id = ${id}::uuid
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return success({ executions });
  } catch (error) {
    console.error("Workflow execution history load failed:", error);
    return failure(
      503,
      "EXECUTION_STORAGE_UNAVAILABLE",
      "Could not load execution history. Check the database connection.",
    );
  }
}
