import { NextRequest } from "next/server";
import { failure, success } from "@/lib/server/api-response";
import { requireDb } from "@/lib/server/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return failure(400, "INVALID_EXECUTION_ID", "Execution ID must be a UUID.");
  }

  try {
    const db = requireDb();
    const [execution] = await db`
      SELECT execution_id AS id, status, completed_at AS "completedAt"
      FROM integration.v1_cancel_execution(${id}::uuid)
    `;
    return success({ execution });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : null;
    if (code === "22023" || code === "P0002") {
      return failure(
        409,
        "EXECUTION_NOT_CANCELLABLE",
        "Execution is missing or has already reached a terminal state.",
      );
    }

    console.error("Execution cancellation failed:", error);
    return failure(
      503,
      "EXECUTION_STORAGE_UNAVAILABLE",
      "Could not cancel the execution. Check the database connection.",
    );
  }
}
