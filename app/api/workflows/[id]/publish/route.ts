import { NextRequest } from "next/server";
import { failure, success } from "@/lib/server/api-response";
import { requireDb } from "@/lib/server/db";
import { validateDoc } from "@/lib/server/validate-doc";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return failure(400, "INVALID_WORKFLOW_ID", "Workflow ID must be a UUID.");
  }

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
    const result = await db.begin(async (tx) => {
      const [existing] = await tx`
        SELECT id, name, published_version_id
        FROM public.workflows
        WHERE id = ${id}::uuid
        FOR UPDATE
      `;
      if (!existing) return null;

      if (existing.published_version_id) {
        const [current] = await tx`
          SELECT id, version_number, version_kind, definition, created_at
          FROM public.workflow_versions
          WHERE id = ${existing.published_version_id}::uuid
            AND workflow_id = ${id}::uuid
            AND version_kind = 'published'
            AND definition = ${tx.json(doc)}::jsonb
        `;
        if (current) {
          const [workflow] = await tx`
            SELECT id, name, draft_definition AS doc, updated_at AS "updatedAt",
                   published_version_id AS "publishedVersionId"
            FROM public.workflows
            WHERE id = ${id}::uuid
          `;
          return { workflow, version: current, unchanged: true };
        }
      }

      const [next] = await tx`
        SELECT COALESCE(MAX(version_number), 0) + 1 AS version_number
        FROM public.workflow_versions
        WHERE workflow_id = ${id}::uuid
      `;
      const [version] = await tx`
        INSERT INTO public.workflow_versions (workflow_id, version_number, version_kind, definition)
        VALUES (${id}::uuid, ${next.version_number}, 'published', ${tx.json(doc)})
        RETURNING id, version_number, version_kind, definition, created_at
      `;
      const [workflow] = await tx`
        UPDATE public.workflows
        SET name = ${doc.name.trim()},
            draft_definition = ${tx.json(doc)},
            draft_updated_at = now(),
            updated_at = now(),
            published_version_id = ${version.id}::uuid
        WHERE id = ${id}::uuid
        RETURNING id, name, draft_definition AS doc, updated_at AS "updatedAt",
                  published_version_id AS "publishedVersionId"
      `;
      return { workflow, version, unchanged: false };
    });

    if (!result) return failure(404, "WORKFLOW_NOT_FOUND", "Workflow was not found.");
    return success(result);
  } catch (error) {
    console.error("Workflow publish failed:", error);
    return failure(
      503,
      "WORKFLOW_STORAGE_UNAVAILABLE",
      "Could not publish the workflow. Check the database connection.",
    );
  }
}
