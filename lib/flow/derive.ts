import { ROLES } from "./catalog";
import type { Doc, PathInfo, RoleKey, Step } from "./types";

/** Fills in copy that follows other state: the condition's title and each path's content. */
export function deriveSteps(doc: Doc): Step[] {
  const row = doc.conditions[0];
  const subject = row?.subject ?? "Condition";
  const attributes = row?.attributes ?? [];
  const firstPath = doc.steps.find((s) => s.kind === "path" && s.match !== "else")?.id;

  return doc.steps.map((step) => {
    if (step.kind === "condition") {
      return {
        ...step,
        title: [subject, ...attributes.map((tag) => ({ tag }))],
        panel: { ...step.panel, title: subject, tags: attributes },
      };
    }
    if (step.kind === "path" && step.match) {
      const role = ROLES[step.match];
      const prefix = step.match === "else" ? "Else" : step.id === firstPath ? "If" : "Else If";
      return {
        ...step,
        label: step.match === "else" ? prefix : `${prefix}: ${subject}`,
        chip: { label: role.label, icon: step.match },
        title: [role.title],
        tags: role.tags,
        panel: { title: role.title, tags: [role.label], description: role.description },
      };
    }
    return step;
  });
}

/** The condition's paths in order, with the prefix their caption shows. */
export function pathsOf(steps: Step[]): PathInfo[] {
  return steps
    .filter((s): s is Step & { match: RoleKey } => s.kind === "path" && Boolean(s.match))
    .map((s) => ({ id: s.id, role: s.match, prefix: s.label.split(":")[0] }));
}
