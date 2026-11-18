import { NextRequest } from "next/server";
import { failure, success } from "@/lib/server/api-response";
import { requireDb, withTransientConnectionRetry } from "@/lib/server/db";
import { validateDoc } from "@/lib/server/validate-doc";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id))
    return failure(400, "INVALID_WORKFLOW_ID", "Workflow ID must be a UUID.");

  try {
    const db = requireDb();
    const [workflow] = await withTransientConnectionRetry(
      async () => db`
        SELECT w.id, w.name, w.draft_definition AS doc,
               w.updated_at AS "updatedAt",
               w.published_version_id AS "publishedVersionId",
               v.definition AS "publishedDoc"
        FROM public.workflows AS w
        LEFT JOIN public.workflow_versions AS v
          ON v.id = w.published_version_id
         AND v.workflow_id = w.id
         AND v.version_kind = 'published'
        WHERE w.id = ${id}::uuid
        LIMIT 1
      `,
    );
    if (!workflow) return failure(404, "WORKFLOW_NOT_FOUND", "Workflow was not found.");
    return success({ workflow });
  } catch (error) {
    console.error("Workflow load failed:", error);
    return failure(
      503,
      "WORKFLOW_STORAGE_UNAVAILABLE",
      "Could not load the workflow. Check the database connection.",
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id))
    return failure(400, "INVALID_WORKFLOW_ID", "Workflow ID must be a UUID.");

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
    typeof body === "object" && body !== null && "doc" in body
      ? (body as { doc: unknown }).doc
      : null,
  );
  if (!doc) {
    return failure(422, "VALIDATION_FAILED", "Workflow document has validation errors.", {
      validationErrors: errors,
    });
  }

  try {
    const db = requireDb();
    const workflow = await db.begin(async (tx) => {
      const [existing] = await tx`
        SELECT id FROM public.workflows WHERE id = ${id}::uuid FOR UPDATE
      `;
      if (!existing) return null;

      const [version] = await tx`
        SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
        FROM public.workflow_versions
        WHERE workflow_id = ${id}::uuid
      `;

      const [updated] = await tx`
        UPDATE public.workflows
        SET name = ${doc.name.trim()},
            draft_definition = ${tx.json(doc)},
            draft_updated_at = now(),
            updated_at = now()
        WHERE id = ${id}::uuid
        RETURNING id, name, draft_definition AS doc, updated_at AS "updatedAt"
      `;

      await tx`
        INSERT INTO public.workflow_versions (workflow_id, version_number, version_kind, definition)
        VALUES (${id}::uuid, ${version.next_version}, 'saved', ${tx.json(doc)})
      `;
      return updated;
    });

    if (!workflow) return failure(404, "WORKFLOW_NOT_FOUND", "Workflow was not found.");
    return success({ workflow });
  } catch (error) {
    console.error("Workflow save failed:", error);
    return failure(
      503,
      "WORKFLOW_STORAGE_UNAVAILABLE",
      "Could not save the workflow. Check the database connection.",
    );
  }
}
