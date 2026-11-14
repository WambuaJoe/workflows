import type { AddButton, Bounds, Edge, FlowLayout, Link, Step } from "./types";

export const STEP_WIDTH = 262;
export const STEP_HEIGHT = 120;
export const ADD_BUTTON_SIZE = 46;
/** Width the opening view frames: the flow plus the design's empty margin to its left. */
export const FRAME_WIDTH = 806;
export const FRAME_OFFSET_X = 233;

const ROW_GAP = 228;
const COLUMN_GAP = 285;
const CAPTION_HEIGHT = 22;
const ADD_BUTTON_OFFSET = 84;
// Connectors start just below a card and stop above the next card's caption.
const EDGE_START_GAP = 8;
const EDGE_END_GAP = 33;

/** Connector to an arrow tip: the design's rounded elbow when there's room, otherwise an S-curve. */
export function routeEdge(sx: number, sy: number, tx: number, ty: number): string {
  const dx = tx - sx;
  if (Math.abs(dx) < 0.5 && ty > sy) return `M${sx} ${sy}V${ty}`;
  if (ty - sy >= 44) {
    const s = Math.sign(dx);
    const r1 = Math.min(10, Math.abs(dx) / 2);
    const r2 = Math.min(17, Math.abs(dx) / 2);
    return `M${sx} ${sy}V${sy + 7}Q${sx} ${sy + 17} ${sx + s * r1} ${sy + 18}L${tx - s * r2} ${ty - 26}Q${tx} ${ty - 24} ${tx} ${ty - 10}V${ty}`;
  }
  const pull = Math.max(48, Math.abs(ty - sy) / 2 + 36);
  return `M${sx} ${sy}C${sx} ${sy + pull} ${tx} ${ty - pull} ${tx} ${ty}`;
}

export function edgeBetween(from: Step, to: { x: number; y: number }): string {
  return routeEdge(
    from.x + STEP_WIDTH / 2,
    from.y + STEP_HEIGHT + EDGE_START_GAP,
    to.x + STEP_WIDTH / 2,
    to.y - EDGE_END_GAP,
  );
}

/** Connectors, "+" buttons and bounds for the current steps. */
export function layoutFlow(steps: Step[], links: Link[]): FlowLayout {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const edges: Edge[] = [];

  for (const link of links) {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (from && to) edges.push({ id: `${link.from}->${link.to}`, d: edgeBetween(from, to) });
  }

  // Every step at the end of a path offers a "+" to continue it.
  const hasNext = new Set(links.map((l) => l.from));
  const addButtons: AddButton[] = steps
    .filter((s) => !hasNext.has(s.id))
    .map((s) => ({
      parentId: s.id,
      x: s.x + STEP_WIDTH / 2 - ADD_BUTTON_SIZE / 2,
      y: s.y + STEP_HEIGHT + ADD_BUTTON_OFFSET,
    }));
  for (const button of addButtons) {
    const step = byId.get(button.parentId)!;
    const cx = step.x + STEP_WIDTH / 2;
    edges.push({
      id: `${step.id}->add`,
      d: `M${cx} ${step.y + STEP_HEIGHT + EDGE_START_GAP}V${button.y - 10}`,
    });
  }

  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const s of steps) {
    bounds.minX = Math.min(bounds.minX, s.x);
    bounds.minY = Math.min(bounds.minY, s.y - CAPTION_HEIGHT);
    bounds.maxX = Math.max(bounds.maxX, s.x + STEP_WIDTH);
    bounds.maxY = Math.max(bounds.maxY, s.y + STEP_HEIGHT);
  }
  for (const b of addButtons) bounds.maxY = Math.max(bounds.maxY, b.y + ADD_BUTTON_SIZE);
  if (!Number.isFinite(bounds.minX)) Object.assign(bounds, { minX: 0, minY: 0, maxX: 1, maxY: 1 });

  return { edges, addButtons, bounds };
}

function overlapsAny(steps: Step[], x: number, y: number) {
  return steps.some(
    (s) => Math.abs(s.x - x) < STEP_WIDTH + 16 && Math.abs(s.y - y) < STEP_HEIGHT + 60,
  );
}

/** A free spot one row below the parent, stepping right past anything in the way. */
export function placeBelow(steps: Step[], parentId: string) {
  const parent = steps.find((s) => s.id === parentId);
  if (!parent) return { x: FRAME_OFFSET_X, y: 40 };
  let x = parent.x;
  const y = parent.y + ROW_GAP;
  for (let i = 0; i < 24 && overlapsAny(steps, x, y); i++) x += COLUMN_GAP;
  return { x, y };
}

/** The step a card dropped at (x, y) should follow. Conditions only take paths, so they're skipped. */
export function nearestParent(steps: Step[], x: number, y: number): string | null {
  const cx = x + STEP_WIDTH / 2;
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const s of steps) {
    if (s.kind === "condition") continue;
    const bottom = s.y + STEP_HEIGHT;
    if (bottom > y - 24) continue;
    const distance = Math.hypot(s.x + STEP_WIDTH / 2 - cx, (y - bottom) * 1.2);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = s.id;
    }
  }
  return best;
}
