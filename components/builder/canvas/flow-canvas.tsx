"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/cn";
import {
  STEP_HEIGHT,
  STEP_WIDTH,
  edgeBetween,
  layoutFlow,
  type AppInfo,
  type Link,
  type RoleKey,
  type Step,
} from "@/lib/flow";
import { AddStepButton } from "./add-step-button";
import { CanvasToolbar, type Tool } from "./canvas-toolbar";
import { Connectors } from "./connectors";
import { DropGhost } from "./drop-ghost";
import { NamePill } from "./name-pill";
import { StepCard } from "./step-card";
import { useCanvasView } from "./use-canvas-view";

/** What the canvas exposes to drags that start outside it. */
export type CanvasApi = {
  clientToWorld: (clientX: number, clientY: number) => { x: number; y: number };
};

/** Where a dragged app would land, in canvas coordinates. */
export type DropPreview = { app: AppInfo; x: number; y: number; parentId: string | null };

const GRID = 12;
const NUDGE = 12;
const DRAG_THRESHOLD = 4;
const INTRO_MS = 900;
// Room above and below a new step for its caption and "+", so revealing it shows both.
const CAPTION_SPACE = 22;
const ADD_BUTTON_SPACE = 130;

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

type FlowCanvasProps = {
  steps: Step[];
  links: Link[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveStep: (id: string, x: number, y: number) => void;
  onAddStep: (parentId: string) => void;
  onDeleteStep: (id: string) => void;
  takenRoles: RoleKey[];
  onRoleChange: (id: string, role: RoleKey) => void;
  name: string;
  onRename: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Width covered by the panel on the right. */
  inset: number;
  dropPreview: DropPreview | null;
  /** A step whose edit was refused; it shakes once per nonce. */
  shake: { stepId: string; nonce: number } | null;
  apiRef: RefObject<CanvasApi | null>;
};

/** The pannable, zoomable rule canvas with its name pill and toolbar. */
export function FlowCanvas({
  steps,
  links,
  selectedId,
  onSelect,
  onMoveStep,
  onAddStep,
  onDeleteStep,
  takenRoles,
  onRoleChange,
  name,
  onRename,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  inset,
  dropPreview,
  shake,
  apiRef,
}: FlowCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [intro, setIntro] = useState(true);
  const [dragged, setDragged] = useState<{ id: string; x: number; y: number } | null>(null);
  const handMode = tool === "hand" || spaceHeld;

  // A dragged card follows the pointer locally; the document only changes on release.
  const displaySteps = useMemo(
    () =>
      dragged
        ? steps.map((s) => (s.id === dragged.id ? { ...s, x: dragged.x, y: dragged.y } : s))
        : steps,
    [steps, dragged],
  );
  const layout = useMemo(() => layoutFlow(displaySteps, links), [displaySteps, links]);
  const { view, ready, stopGlide, takeControl, panTo, reveal, clientToWorld, ...zoomControls } =
    useCanvasView(surfaceRef, inset, layout.bounds);

  const latest = useRef({
    view,
    steps: displaySteps,
    selectedId,
    onSelect,
    onMoveStep,
    onDeleteStep,
    onUndo,
    onRedo,
  });
  useEffect(() => {
    latest.current = {
      view,
      steps: displaySteps,
      selectedId,
      onSelect,
      onMoveStep,
      onDeleteStep,
      onUndo,
      onRedo,
    };
  });

  useEffect(() => {
    apiRef.current = { clientToWorld };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, clientToWorld]);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setIntro(false), INTRO_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  // Edits hand the view to the user, and a step added out of sight glides into view.
  const knownIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!ready) return;
    const known = knownIds.current;
    knownIds.current = new Set(steps.map((s) => s.id));
    if (!known) return;
    const added = steps.filter((s) => !known.has(s.id));
    if (added.length || known.size !== steps.length) takeControl();
    if (added.length !== 1) return;
    const s = added[0];
    reveal({
      minX: s.x,
      maxX: s.x + STEP_WIDTH,
      minY: s.y - CAPTION_SPACE,
      maxY: s.y + STEP_HEIGHT + ADD_BUTTON_SPACE,
    });
  }, [steps, ready, takeControl, reveal]);

  // Keyboard actions apply instantly, without animation.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const l = latest.current;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && (key === "z" || key === "y")) {
        e.preventDefault();
        if (key === "y" || e.shiftKey) l.onRedo();
        else l.onUndo();
        return;
      }
      if (mod || e.altKey) return;

      const onBackground = e.target === document.body || e.target === surfaceRef.current;
      const onCanvas =
        onBackground || (e.target instanceof Node && !!surfaceRef.current?.contains(e.target));
      const selected = l.steps.find((s) => s.id === l.selectedId);

      if (key === "v") setTool("select");
      else if (key === "h") setTool("hand");
      else if (e.code === "Space" && onBackground) {
        e.preventDefault();
        if (!e.repeat) setSpaceHeld(true);
      } else if (onCanvas && selected && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? NUDGE * 4 : NUDGE;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        l.onMoveStep(selected.id, selected.x + dx, selected.y + dy);
      } else if (onCanvas && selected && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        l.onDeleteStep(selected.id);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Background drag pans. With the hand tool or the middle button, so does dragging a card.
  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(
    null,
  );

  const onSurfacePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    const onItem = (e.target as HTMLElement).closest("[data-step],[data-control]");
    if (onItem && !handMode && e.button === 0) return;
    e.preventDefault();
    stopGlide();
    e.currentTarget.setPointerCapture(e.pointerId);
    pan.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
    setPanning(true);
  };

  const onSurfacePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = pan.current;
    if (!p) return;
    const dx = e.clientX - p.sx;
    const dy = e.clientY - p.sy;
    if (!p.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      p.moved = true;
      takeControl();
      document.body.classList.add("is-grabbing");
    }
    panTo(p.ox + dx, p.oy + dy);
  };

  const onSurfacePointerUp = () => {
    const p = pan.current;
    if (!p) return;
    pan.current = null;
    setPanning(false);
    document.body.classList.remove("is-grabbing");
    // A plain click on empty canvas clears the selection.
    if (!p.moved && !handMode) onSelect(null);
  };

  // Pressing a card selects it; dragging past the threshold moves it, committed as one undo step.
  const onStepPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, step: Step) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      latest.current.onSelect(step.id);
      takeControl();
      const { scale } = latest.current.view;
      const sx = e.clientX;
      const sy = e.clientY;
      let moved = false;
      const positionAt = (ev: PointerEvent) => ({
        x: Math.round(step.x + (ev.clientX - sx) / scale),
        y: Math.round(step.y + (ev.clientY - sy) / scale),
      });
      const onMove = (ev: PointerEvent) => {
        if (!moved) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_THRESHOLD) return;
          moved = true;
          document.body.classList.add("is-grabbing");
        }
        setDragged({ id: step.id, ...positionAt(ev) });
      };
      const finish = (ev: PointerEvent | null) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        document.body.classList.remove("is-grabbing");
        if (moved && ev) {
          const p = positionAt(ev);
          latest.current.onMoveStep(step.id, p.x, p.y);
        }
        setDragged(null);
      };
      const onUp = (ev: PointerEvent) => finish(ev);
      const onCancel = () => finish(null);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    },
    [takeControl],
  );

  const previewParent = dropPreview?.parentId
    ? displaySteps.find((s) => s.id === dropPreview.parentId)
    : undefined;

  return (
    <div className="absolute inset-0 overflow-hidden bg-canvas">
      <div
        ref={surfaceRef}
        data-canvas-surface
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onSurfacePointerMove}
        onPointerUp={onSurfacePointerUp}
        onPointerCancel={onSurfacePointerUp}
        className={cn(
          "absolute inset-0 touch-none select-none",
          panning ? "cursor-grabbing" : handMode ? "cursor-grab" : "cursor-default",
        )}
        style={{
          backgroundImage: "radial-gradient(circle, var(--color-dot) 1px, transparent 1.3px)",
          backgroundSize: `${GRID * view.scale}px ${GRID * view.scale}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
      >
        {ready && (
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          >
            <Connectors
              edges={layout.edges}
              intro={intro}
              preview={
                dropPreview && previewParent ? edgeBetween(previewParent, dropPreview) : null
              }
            />

            <AnimatePresence>
              {displaySteps.map((step, i) => (
                <StepCard
                  key={step.id}
                  step={step}
                  selected={step.id === selectedId}
                  dragging={step.id === dragged?.id}
                  dropTarget={step.id === dropPreview?.parentId}
                  interactive={!handMode}
                  enterDelay={intro ? 0.04 + i * 0.045 : 0}
                  shakeNonce={shake?.stepId === step.id ? shake.nonce : 0}
                  takenRoles={takenRoles}
                  onPointerDown={onStepPointerDown}
                  onActivate={onSelect}
                  onRoleChange={onRoleChange}
                />
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {layout.addButtons.map((button) => (
                <AddStepButton
                  key={button.parentId}
                  button={button}
                  delay={intro ? 0.4 : 0.08}
                  onAdd={onAddStep}
                />
              ))}
            </AnimatePresence>

            {dropPreview && <DropGhost preview={dropPreview} />}
          </div>
        )}
      </div>

      <NamePill name={name} onRename={onRename} />

      <CanvasToolbar
        tool={tool}
        onToolChange={setTool}
        zoom={zoomControls.zoom}
        onZoomIn={zoomControls.zoomIn}
        onZoomOut={zoomControls.zoomOut}
        onZoomTo={zoomControls.zoomTo}
        onFit={zoomControls.fit}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        inset={inset}
      />
    </div>
  );
}
