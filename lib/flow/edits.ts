import { APP_BY_KEY, type AppKey } from "./apps";
import { DEFAULT_SETTINGS, ROLES, ROLE_ORDER } from "./catalog";
import { placeBelow } from "./geometry";
import type { ActionTemplate, Doc, RoleKey, Step, StepAction, StepSettings } from "./types";

type Point = { x: number; y: number };

export const nextStepId = (doc: Doc) => `step-${doc.nextId}`;
export const nextPathId = (doc: Doc) => `path-${doc.nextId}`;

/** A path for a role. Its caption is filled in by deriveSteps. */
export function createPath(id: string, match: RoleKey, at: Point): Step {
  const role = ROLES[match];
  return {
    id,
    kind: "path",
    match,
    label: "",
    x: at.x,
    y: at.y,
    chip: { label: role.label, icon: match },
    title: [role.title],
    tags: role.tags,
    panel: { title: role.title, tags: [role.label], description: role.description },
  };
}

/** An action step, preset for a linked app when one is given. */
function createAction(id: string, at: Point, appKey?: AppKey): Step {
  const app = appKey ? APP_BY_KEY[appKey] : undefined;
  const title = app?.action ?? "Untitled action";
  return {
    id,
    kind: "action",
    label: "Then",
    x: Math.round(at.x),
    y: Math.round(at.y),
    chip: { label: "Do this", icon: "doThis" },
    app: app?.key,
    title: [title],
    panel: {
      title,
      tags: [app?.name ?? "Action"],
      description:
        app?.stepDescription ??
        "Choose what happens at this point in the flow, then link an app to run it.",
    },
  };
}

function updateStep(doc: Doc, id: string, patch: Partial<Step>): Doc {
  return { ...doc, steps: doc.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
}

/** Adds an action step after `parentId`, below it or at `at` when dropped somewhere specific. */
export function addStep(
  doc: Doc,
  parentId: string | null,
  options: { app?: AppKey; at?: Point } = {},
): Doc {
  const id = nextStepId(doc);
  const at = options.at ?? placeBelow(doc.steps, parentId);
  return {
    ...doc,
    nextId: doc.nextId + 1,
    steps: [...doc.steps, createAction(id, at, options.app)],
    links: parentId ? [...doc.links, { from: parentId, to: id }] : doc.links,
  };
}

/** The first role no path handles yet, or null when all are taken. */
export function unusedRole(doc: Doc): RoleKey | null {
  const used = new Set(doc.steps.map((s) => s.match));
  return ROLE_ORDER.find((role) => !used.has(role)) ?? null;
}

/** Adds a path to a condition for the next unhandled role. */
export function addPath(doc: Doc, conditionId: string): Doc {
  const role = unusedRole(doc);
  if (!role) return doc;
  const id = nextPathId(doc);
  return {
    ...doc,
    nextId: doc.nextId + 1,
    steps: [...doc.steps, createPath(id, role, placeBelow(doc.steps, conditionId))],
    links: [...doc.links, { from: conditionId, to: id }],
  };
}

export function addAction(doc: Doc, stepId: string, template: ActionTemplate): Doc {
  const step = doc.steps.find((s) => s.id === stepId);
  if (!step) return doc;
  const action: StepAction = { ...template, id: `action-${doc.nextId}` };
  return {
    ...updateStep(doc, stepId, { actions: [...(step.actions ?? []), action] }),
    nextId: doc.nextId + 1,
  };
}

export const setActions = (doc: Doc, stepId: string, actions: StepAction[]) =>
  updateStep(doc, stepId, { actions });

export const setAudience = (doc: Doc, stepId: string, audience: RoleKey[]) =>
  updateStep(doc, stepId, { audience });

export const setPathRole = (doc: Doc, stepId: string, match: RoleKey) =>
  updateStep(doc, stepId, { match });

export function updateSettings(doc: Doc, stepId: string, patch: Partial<StepSettings>): Doc {
  const step = doc.steps.find((s) => s.id === stepId);
  if (!step) return doc;
  return updateStep(doc, stepId, { settings: { ...DEFAULT_SETTINGS, ...step.settings, ...patch } });
}

/** Adds an empty row to the condition. */
export function addConditionRow(doc: Doc): Doc {
  return {
    ...doc,
    nextId: doc.nextId + 1,
    conditions: [
      ...doc.conditions,
      { id: `condition-${doc.nextId}`, subject: "User property", attributes: [] },
    ],
  };
}

export function moveStep(doc: Doc, id: string, x: number, y: number): Doc {
  const step = doc.steps.find((s) => s.id === id);
  if (!step || (step.x === x && step.y === y)) return doc;
  return updateStep(doc, id, { x, y });
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Why removing a step would break the flow, or null when it's safe. */
export function removalProblem(doc: Doc, id: string): string | null {
  const step = doc.steps.find((s) => s.id === id);
  if (!step) return null;
  const children = doc.links
    .filter((l) => l.from === id)
    .map((l) => doc.steps.find((s) => s.id === l.to))
    .filter((s): s is Step => Boolean(s));

  if (step.kind === "trigger") {
    return "The trigger is what starts this rule, so the flow can't run without it.";
  }
  const paths = children.filter((c) => c.kind === "path").length;
  if (step.kind === "condition" && paths > 0) {
    return `It splits the flow into ${plural(paths, "path")}, which would be left without a condition. Delete the paths first.`;
  }
  if (step.kind === "path" && children.length > 0) {
    return `This path still leads to ${plural(children.length, "step")}, which would end up directly under the condition. Delete or move those first.`;
  }
  return null;
}

/** Removes a step and joins its parents straight to its children. Check removalProblem first. */
export function removeStep(doc: Doc, id: string): Doc {
  const parents = doc.links.filter((l) => l.to === id).map((l) => l.from);
  const children = doc.links.filter((l) => l.from === id).map((l) => l.to);
  const kept = doc.links.filter((l) => l.from !== id && l.to !== id);
  const bridged = parents
    .flatMap((from) => children.map((to) => ({ from, to })))
    .filter((b) => !kept.some((l) => l.from === b.from && l.to === b.to));
  return { ...doc, steps: doc.steps.filter((s) => s.id !== id), links: [...kept, ...bridged] };
}
