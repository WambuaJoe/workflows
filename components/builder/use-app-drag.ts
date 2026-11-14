"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { STEP_WIDTH, nearestParent, type AppInfo, type Step } from "@/lib/flow";
import type { CanvasApi, DropPreview } from "./canvas/flow-canvas";

const DRAG_THRESHOLD = 5;
/** How far below the pointer's grip the dropped card's top edge sits. */
const GRIP_OFFSET_Y = 28;

export type AppDrag = {
  app: AppInfo;
  clientX: number;
  clientY: number;
  /** Over the canvas: where a new step would land. */
  preview: DropPreview | null;
  /** Over the panel's "Add action" area: the app becomes an action of the selected step. */
  overStep: boolean;
};

type Options = {
  canvasApi: RefObject<CanvasApi | null>;
  steps: Step[];
  onDropOnCanvas: (preview: DropPreview) => void;
  onDropOnStep: (app: AppInfo) => void;
};

/**
 * Drags apps out of the panel with pointer events rather than native drag and drop,
 * so the canvas can preview the drop at its own zoom.
 */
export function useAppDrag({ canvasApi, steps, onDropOnCanvas, onDropOnStep }: Options) {
  const [drag, setDrag] = useState<AppDrag | null>(null);
  const justDragged = useRef(false);

  const latest = useRef({ steps, onDropOnCanvas, onDropOnStep });
  useEffect(() => {
    latest.current = { steps, onDropOnCanvas, onDropOnStep };
  });

  const targetAt = useCallback(
    (app: AppInfo, clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY);
      if (el?.closest("[data-action-dropzone]")) return { preview: null, overStep: true };
      const api = canvasApi.current;
      if (!api || !el?.closest("[data-canvas-surface]")) return { preview: null, overStep: false };
      const world = api.clientToWorld(clientX, clientY);
      const x = Math.round(world.x - STEP_WIDTH / 2);
      const y = Math.round(world.y - GRIP_OFFSET_Y);
      const preview = { app, x, y, parentId: nearestParent(latest.current.steps, x, y) };
      return { preview, overStep: false };
    },
    [canvasApi],
  );

  const startDrag = useCallback(
    (app: AppInfo, e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      const sx = e.clientX;
      const sy = e.clientY;
      let active = false;

      const onMove = (ev: PointerEvent) => {
        // The release happened somewhere we didn't hear about; treat it as a cancel.
        if (ev.buttons === 0) return finish(null);
        if (!active) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_THRESHOLD) return;
          active = true;
          justDragged.current = true;
          document.body.classList.add("is-grabbing");
        }
        setDrag({
          app,
          clientX: ev.clientX,
          clientY: ev.clientY,
          ...targetAt(app, ev.clientX, ev.clientY),
        });
      };

      const finish = (ev: PointerEvent | null) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("keydown", onKeyDown);
        document.body.classList.remove("is-grabbing");
        if (active && ev) {
          const { preview, overStep } = targetAt(app, ev.clientX, ev.clientY);
          if (overStep) latest.current.onDropOnStep(app);
          else if (preview) latest.current.onDropOnCanvas(preview);
        }
        setDrag(null);
        // The click after the release belongs to the drag, so keep ignoring clicks until then.
        // A cancelled drag (Escape) hasn't been released yet, so wait for that release.
        const resetAfterClick = () =>
          window.setTimeout(() => {
            justDragged.current = false;
          }, 0);
        if (ev) resetAfterClick();
        else window.addEventListener("pointerup", resetAfterClick, { once: true });
      };
      const onUp = (ev: PointerEvent) => finish(ev);
      const onCancel = () => finish(null);
      const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") finish(null);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKeyDown);
    },
    [targetAt],
  );

  /** True when a click is the tail end of a drag and should be ignored. */
  const isDragClick = useCallback(() => justDragged.current, []);

  return { drag, startDrag, isDragClick };
}
