import type { Doc, StepKind } from "@/lib/flow";

export type WorkflowValidationError = {
  nodeId?: string;
  field: string;
  code: string;
  message: string;
};

const STEP_KINDS = new Set<StepKind>(["trigger", "condition", "path", "action"]);

export function validateWorkflowDefinition(value: unknown): WorkflowValidationError[] {
  const errors: WorkflowValidationError[] = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [{ field: "definition", code: "invalid_document", message: "Workflow definition must be a JSON object." }];
  }

  const doc = value as Partial<Doc>;

  if (typeof doc.name !== "string" || !doc.name.trim()) {
    errors.push({ field: "name", code: "required", message: "Give this workflow a name." });
  }

  if (!Array.isArray(doc.steps) || doc.steps.length === 0) {
    errors.push({ field: "steps", code: "required", message: "Add at least one workflow node." });
  }

  if (!Array.isArray(doc.links)) {
    errors.push({ field: "links", code: "invalid_links", message: "Workflow connections must be an array." });
  }

  if (!Array.isArray(doc.steps) || !Array.isArray(doc.links)) return errors;

  const ids = new Set<string>();
  const nodes = new Map<string, Doc["steps"][number]>();

  for (const [index, rawStep] of doc.steps.entries()) {
    if (!rawStep || typeof rawStep !== "object") {
      errors.push({ field: `steps[${index}]`, code: "invalid_node", message: "This node is not a valid object." });
      continue;
    }

    const step = rawStep as Doc["steps"][number];
    if (typeof step.id !== "string" || !step.id.trim()) {
      errors.push({ field: `steps[${index}].id`, code: "required", message: "Every node needs an identifier." });
      continue;
    }

    if (ids.has(step.id)) {
      errors.push({ nodeId: step.id, field: "id", code: "duplicate_node_id", message: "This node identifier is duplicated." });
    }
    ids.add(step.id);
    nodes.set(step.id, step);

    if (!STEP_KINDS.has(step.kind)) {
      errors.push({ nodeId: step.id, field: "kind", code: "unsupported_node", message: "This node type is not supported." });
    }
  }

  const triggers = [...nodes.values()].filter((step) => step.kind === "trigger");
  if (triggers.length !== 1) {
    errors.push({ field: "steps", code: "trigger_count", message: "A workflow must contain exactly one trigger." });
  }

  const edges = new Set<string>();
  for (const [index, link] of doc.links.entries()) {
    if (!link || typeof link.from !== "string" || typeof link.to !== "string") {
      errors.push({ field: `links[${index}]`, code: "invalid_connection", message: "This connection is incomplete." });
      continue;
    }
    if (!nodes.has(link.from)) {
      errors.push({ field: `links[${index}].from`, code: "missing_source", message: "The connection's source node no longer exists." });
    }
    if (!nodes.has(link.to)) {
      errors.push({ field: `links[${index}].to`, code: "missing_target", message: "The connection's destination node no longer exists." });
    }
    if (link.from === link.to) {
      errors.push({ nodeId: link.from, field: "connections", code: "self_connection", message: "A node cannot connect to itself." });
    }
    const key = `${link.from}->${link.to}`;
    if (edges.has(key)) {
      errors.push({ nodeId: link.to, field: "connections", code: "duplicate_connection", message: "This connection is duplicated." });
    }
    edges.add(key);
  }

  return errors;
}
