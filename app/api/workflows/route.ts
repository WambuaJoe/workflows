import { NextRequest } from "next/server";
import { failure, success } from "@/lib/server/api-response";
import { requireDb } from "@/lib/server/db";
import { validateDoc } from "@/lib/server/validate-doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 1_000_000) {
      return failure(413, "PAYLOAD_TOO_LARGE", "Workflow document exceeds the 1 MB limit.");
    }
    body = JSON.parse(text);
  } catch {
    return failure(400, "INVALID_JSON", "Request body must contain valid JSON.");
  }

  const { doc, errors } = validateDoc(
    typeof body === "object" && body !== null && "doc" in body ? (body as { doc: unknown }).doc : null,
  );
  if (!doc) {
    return failure(422, "VALIDATION_FAILED", "Workflow document has validation errors.", {
      validationErrors: errors,
    });
  }

  try {
    const db = requireDb();
    const [workflow] = await db`
      INSERT INTO public.workflows (name, draft_definition)
      VALUES (${doc.name.trim()}, ${db.json(doc)})
      RETURNING id, name, draft_definition AS doc, updated_at AS "updatedAt"
    `;
    return success({ workflow }, 201);
  } catch (error) {
    console.error("Workflow creation failed:", error);
    return failure(503, "WORKFLOW_STORAGE_UNAVAILABLE", "Could not create the workflow. Check the database connection.");
  }
}
