import type { Doc } from "@/lib/flow";
import type { ValidationIssue } from "./api-response";

const STEP_KINDS = new Set(["trigger", "condition", "path", "action"]);
const ACTION_KINDS = new Set(["email", "message", "tag", "wait", "notify", "app"]);
const APP_KEYS = new Set(["slack", "asana", "mailchimp", "zapier", "spotify"]);
const ROLE_KEYS = new Set(["founder", "designer", "developer", "marketer", "product", "else"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateDoc(value: unknown): { doc: Doc | null; errors: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const issue = (nodeId: string | null, field: string, message: string, fix: string) =>
    errors.push({ nodeId, field, message, fix });

  if (!isRecord(value)) {
    issue(null, "document", "Workflow document must be a JSON object.", "Send a valid workflow document object.");
    return { doc: null, errors };
  }

  if (typeof value.name !== "string" || !value.name.trim()) {
    issue(null, "name", "Workflow name is required.", "Enter a name between 1 and 120 characters.");
  } else if (value.name.trim().length > 120) {
    issue(null, "name", "Workflow name cannot exceed 120 characters.", "Shorten the workflow name.");
  }

  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    issue(null, "steps", "A workflow must contain at least one step.", "Add a trigger or action step.");
  } else if (value.steps.length > 200) {
    issue(null, "steps", "A workflow cannot contain more than 200 steps in the prototype.", "Split the workflow into smaller workflows.");
  }

  if (!Array.isArray(value.links)) {
    issue(null, "links", "Workflow links must be an array.", "Provide an array of { from, to } links.");
  } else if (value.links.length > 500) {
    issue(null, "links", "A workflow cannot contain more than 500 links in the prototype.", "Reduce the number of connections.");
  }

  if (typeof value.conditionType !== "string") {
    issue(null, "conditionType", "Condition type must be text.", "Choose a supported condition type.");
  }
  if (!Array.isArray(value.conditions)) {
    issue(null, "conditions", "Conditions must be an array.", "Provide the workflow's condition rows.");
  }
  if (!Number.isInteger(value.nextId) || Number(value.nextId) < 1) {
    issue(null, "nextId", "The next step ID counter is invalid.", "Use a positive integer for nextId.");
  }

  if (Array.isArray(value.steps)) {
    const ids = new Set<string>();
    for (const [index, raw] of value.steps.entries()) {
      const nodeId = isRecord(raw) && typeof raw.id === "string" ? raw.id : null;
      const prefix = `steps[${index}]`;
      if (!isRecord(raw)) {
        issue(null, prefix, "Step must be an object.", "Replace this item with a valid step object.");
        continue;
      }
      if (!nodeId) issue(null, `${prefix}.id`, "Step ID is required.", "Give this step a unique string ID.");
      else if (ids.has(nodeId)) issue(nodeId, "id", "Step IDs must be unique.", "Assign a different ID to this step.");
      else ids.add(nodeId);

      if (typeof raw.kind !== "string" || !STEP_KINDS.has(raw.kind)) {
        issue(nodeId, "kind", "This step type is not supported.", "Use trigger, condition, path, or action.");
      }
      if (typeof raw.label !== "string") issue(nodeId, "label", "Step label must be text.", "Provide a short step label.");
      if (!Number.isFinite(raw.x) || !Number.isFinite(raw.y)) {
        issue(nodeId, "position", "Step position must contain finite x and y coordinates.", "Set valid numeric canvas coordinates.");
      }
      if (!Array.isArray(raw.title) || raw.title.some((part) =>
        typeof part !== "string" && !(isRecord(part) && typeof part.tag === "string")
      )) {
        issue(nodeId, "title", "Step title contains an unsupported value.", "Use plain text segments or { tag: string } segments.");
      }
      if (!isRecord(raw.chip) || typeof raw.chip.label !== "string" || typeof raw.chip.icon !== "string") {
        issue(nodeId, "chip", "Step chip metadata is invalid.", "Provide a chip label and icon.");
      }
      if (!isRecord(raw.panel) || typeof raw.panel.title !== "string" ||
          typeof raw.panel.description !== "string" || !Array.isArray(raw.panel.tags)) {
        issue(nodeId, "panel", "Step panel metadata is invalid.", "Provide panel title, description, and tags.");
      }
      if (raw.app !== undefined && (typeof raw.app !== "string" || !APP_KEYS.has(raw.app))) {
        issue(nodeId, "app", "This linked app is not supported.", "Choose a supported app from the app catalogue.");
      }
      if (raw.match !== undefined && (typeof raw.match !== "string" || !ROLE_KEYS.has(raw.match))) {
        issue(nodeId, "match", "This path role is not supported.", "Choose a role from the supported role list.");
      }
      if (raw.actions !== undefined) {
        if (!Array.isArray(raw.actions)) {
          issue(nodeId, "actions", "Actions must be an array.", "Provide an array of action objects.");
        } else {
          for (const [actionIndex, action] of raw.actions.entries()) {
            if (!isRecord(action)) {
              issue(nodeId, `actions[${actionIndex}]`, "Action must be an object.", "Replace it with a valid action object.");
              continue;
            }
            if (typeof action.id !== "string" || typeof action.label !== "string" ||
                typeof action.detail !== "string" || typeof action.kind !== "string" ||
                !ACTION_KINDS.has(action.kind)) {
              issue(nodeId, `actions[${actionIndex}]`, "Action fields are incomplete or unsupported.", "Provide an ID, supported kind, label, and detail.");
            }
            if (action.app !== undefined && (typeof action.app !== "string" || !APP_KEYS.has(action.app))) {
              issue(nodeId, `actions[${actionIndex}].app`, "This action app is not supported.", "Choose a supported app from the app catalogue.");
            }
          }
        }
      }
      if (raw.settings !== undefined && !isRecord(raw.settings)) {
        issue(nodeId, "settings", "Step settings must be an object.", "Provide valid step settings.");
      }
    }

    if (Array.isArray(value.links)) {
      const linkKeys = new Set<string>();
      for (const [index, link] of value.links.entries()) {
        if (!isRecord(link) || typeof link.from !== "string" || typeof link.to !== "string") {
          issue(null, `links[${index}]`, "Link must contain from and to step IDs.", "Connect two existing step IDs.");
          continue;
        }
        if (!ids.has(link.from) || !ids.has(link.to)) {
          issue(link.from, `links[${index}]`, "Link references a step that does not exist.", "Remove the broken link or restore the missing step.");
        }
        if (link.from === link.to) {
          issue(link.from, `links[${index}]`, "A step cannot link to itself.", "Connect this step to a different step.");
        }
        const key = `${link.from}->${link.to}`;
        if (linkKeys.has(key)) issue(link.from, `links[${index}]`, "Duplicate workflow link.", "Keep only one connection between these steps.");
        linkKeys.add(key);
      }
    }
  }

  if (Array.isArray(value.conditions)) {
    for (const [index, condition] of value.conditions.entries()) {
      if (!isRecord(condition) || typeof condition.id !== "string" ||
          typeof condition.subject !== "string" || !Array.isArray(condition.attributes) ||
          condition.attributes.some((item) => typeof item !== "string")) {
        issue(null, `conditions[${index}]`, "Condition row is invalid.", "Provide an ID, subject, and an array of text attributes.");
      }
    }
  }

  return { doc: errors.length ? null : (value as unknown as Doc), errors };
}
