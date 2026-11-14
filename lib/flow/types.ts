import type { AppKey } from "./apps";

/** Answers the "User selects" condition can branch on. */
export type RoleKey = "founder" | "designer" | "developer" | "marketer" | "product" | "else";

export type StepKind = "trigger" | "condition" | "path" | "action";

/** Icon in a step's chip. Paths use their role's icon. */
export type ChipIcon = "play" | "doThis" | RoleKey;

/** Part of a step title: plain text, or a tag rendered as a pill. */
export type Segment = string | { tag: string };

export type ActionKind = "email" | "message" | "tag" | "wait" | "notify" | "app";

/** Something a step does when the flow reaches it. */
export type StepAction = {
  id: string;
  kind: ActionKind;
  label: string;
  detail: string;
  app?: AppKey;
};

export type ActionTemplate = Omit<StepAction, "id">;

export type Step = {
  id: string;
  kind: StepKind;
  /** Caption above the card. */
  label: string;
  /** Top-left corner in canvas coordinates. */
  x: number;
  y: number;
  chip: { label: string; icon: ChipIcon };
  /** Set on steps created from a linked app; its logo becomes the badge. */
  app?: AppKey;
  title: Segment[];
  /** Filter tags in the card footer. */
  tags?: string[];
  panel: { title: string; tags: string[]; description: string };
  actions?: StepAction[];
  /** Paths only: the answer this path handles. */
  match?: RoleKey;
  /** Other steps: the roles it runs for. Empty means everyone. */
  audience?: RoleKey[];
};

export type Link = { from: string; to: string };

export type ConditionRow = { id: string; subject: string; attributes: string[] };

/** The editable rule. Undo and redo snapshot the whole value. */
export type Doc = {
  name: string;
  steps: Step[];
  links: Link[];
  /** Rows of the condition; the first one titles it. */
  conditions: ConditionRow[];
  nextId: number;
};

/** A condition path as listed in the panel. */
export type PathInfo = { id: string; role: RoleKey; prefix: string };

export type Edge = { id: string; d: string };
export type AddButton = { parentId: string; x: number; y: number };
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
export type FlowLayout = { edges: Edge[]; addButtons: AddButton[]; bounds: Bounds };
