import { NextRequest } from "next/server";
import { failure, success } from "@/lib/server/api-response";
import { requireDb } from "@/lib/server/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return failure(400, "INVALID_WORKFLOW_ID", "Workflow ID must be a UUID.");
  }

  try {
    const db = requireDb();
    const [workflow] = await db`
      SELECT id FROM public.workflows WHERE id = ${id}::uuid
    `;
    if (!workflow) return failure(404, "WORKFLOW_NOT_FOUND", "Workflow was not found.");

    const versions = await db`
      SELECT id, version_number AS "versionNumber", version_kind AS "versionKind",
             definition, created_at AS "createdAt"
      FROM public.workflow_versions
      WHERE workflow_id = ${id}::uuid
      ORDER BY version_number DESC
    `;
    return success({ versions });
  } catch (error) {
    console.error("Workflow version history load failed:", error);
    return failure(
      503,
      "WORKFLOW_STORAGE_UNAVAILABLE",
      "Could not load workflow version history. Check the database connection.",
    );
  }
}
