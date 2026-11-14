"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { animate, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { FRAME_WIDTH, type Bounds } from "@/lib/flow";
import { EASE_IN_OUT } from "@/lib/motion";

export type View = { x: number; y: number; scale: number };

/** At scale 1 the flow renders at the size the design labels 72%. */
export const BASE_ZOOM = 72;
/** Space kept clear under the flow for the floating toolbar. */
export const TOOLBAR_CLEARANCE = 92;

const MIN_SCALE = 25 / BASE_ZOOM;
const MAX_SCALE = 200 / BASE_ZOOM;
const ZOOM_STEP = 1.2;
const GLIDE_SECONDS = 0.26;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function zoomAround(view: View, nextScale: number, px: number, py: number): View {
  const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
  const k = scale / view.scale;
  return { scale, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

/** The design's framing: an 806px frame centred in the space left of the panel. */
function frameView(width: number, height: number, inset: number, bounds: Bounds): View {
  const visible = Math.max(width - inset, 280);
  const scale = clamp(
    Math.min(1, visible / FRAME_WIDTH, height / (bounds.maxY + TOOLBAR_CLEARANCE)),
    MIN_SCALE,
    1,
  );
  return { scale, x: (visible - FRAME_WIDTH * scale) / 2, y: 0 };
}

/** Everything in view, clear of the name pill and toolbar. */
function fitView(width: number, height: number, inset: number, b: Bounds): View {
  const visible = Math.max(width - inset, 280);
  const padX = 48;
  const padTop = 64;
  const availableHeight = height - padTop - TOOLBAR_CLEARANCE;
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const scale = clamp(Math.min(1, (visible - padX * 2) / w, availableHeight / h), MIN_SCALE, 1);
  return {
    scale,
    x: (visible - w * scale) / 2 - b.minX * scale,
    y: padTop + Math.max(0, (availableHeight - h * scale) / 2) - b.minY * scale,
  };
}

/**
 * Pan and zoom for the canvas. Frames the design on first layout and on resize until the user
 * takes over; the wheel and pinch act directly, toolbar zooms glide.
 */
export function useCanvasView(
  surfaceRef: RefObject<HTMLDivElement | null>,
  inset: number,
  bounds: Bounds,
) {
  const reduceMotion = useReducedMotion();
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [ready, setReady] = useState(false);
  const userOwnsView = useRef(false);
  const glide = useRef<{ controls: AnimationPlaybackControls; target: View } | null>(null);

  const latest = useRef({ view, inset, bounds });
  useEffect(() => {
    latest.current = { view, inset, bounds };
  });

  const stopGlide = useCallback(() => {
    glide.current?.controls.stop();
    glide.current = null;
  }, []);

  /** For direct manipulation: stops any glide and ends auto-framing. */
  const takeControl = useCallback(() => {
    stopGlide();
    userOwnsView.current = true;
  }, [stopGlide]);

  /** Where the view is heading: a running glide's target, or where it is now. */
  const destination = useCallback(() => glide.current?.target ?? latest.current.view, []);

  const glideTo = useCallback(
    (target: View) => {
      takeControl();
      if (reduceMotion) {
        setView(target);
        return;
      }
      const from = latest.current.view;
      const controls = animate(0, 1, {
        duration: GLIDE_SECONDS,
        ease: EASE_IN_OUT,
        onUpdate: (t) =>
          setView({
            x: from.x + (target.x - from.x) * t,
            y: from.y + (target.y - from.y) * t,
            scale: from.scale + (target.scale - from.scale) * t,
          }),
        onComplete: () => {
          glide.current = null;
        },
      });
      glide.current = { controls, target };
    },
    [reduceMotion, takeControl],
  );

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (userOwnsView.current) return;
      const { width, height } = entry.contentRect;
      setView(frameView(width, height, latest.current.inset, latest.current.bounds));
      setReady(true);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [surfaceRef]);

  // Wheel pans; Ctrl/Cmd + wheel and trackpad pinch zoom around the cursor.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      takeControl();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        setView((v) => zoomAround(v, v.scale * Math.exp(-e.deltaY * 0.01), px, py));
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [surfaceRef, takeControl]);

  const visibleCenter = useCallback(() => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: (rect.width - latest.current.inset) / 2, y: rect.height / 2, rect };
  }, [surfaceRef]);

  const zoomBy = useCallback(
    (factor: number) => {
      const c = visibleCenter();
      if (!c) return;
      const from = destination();
      glideTo(zoomAround(from, from.scale * factor, c.x, c.y));
    },
    [visibleCenter, destination, glideTo],
  );

  const zoomTo = useCallback(
    (percent: number) => {
      const c = visibleCenter();
      if (!c) return;
      glideTo(zoomAround(destination(), percent / BASE_ZOOM, c.x, c.y));
    },
    [visibleCenter, destination, glideTo],
  );

  const fit = useCallback(() => {
    const c = visibleCenter();
    if (!c) return;
    const { inset, bounds } = latest.current;
    glideTo(fitView(c.rect.width, c.rect.height, inset, bounds));
  }, [visibleCenter, glideTo]);

  /** Glides just far enough to bring a canvas-space rect into the visible area. */
  const reveal = useCallback(
    (r: Bounds) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect) return;
      const v = destination();
      const left = r.minX * v.scale + v.x;
      const right = r.maxX * v.scale + v.x;
      const top = r.minY * v.scale + v.y;
      const bottom = r.maxY * v.scale + v.y;
      const maxX = rect.width - latest.current.inset - 24;
      const maxY = rect.height - TOOLBAR_CLEARANCE;
      let dx = 0;
      let dy = 0;
      if (right > maxX) dx = maxX - right;
      if (left + dx < 24) dx = 24 - left;
      if (bottom > maxY) dy = maxY - bottom;
      if (top + dy < 64) dy = 64 - top;
      if (dx || dy) glideTo({ ...v, x: v.x + dx, y: v.y + dy });
    },
    [surfaceRef, destination, glideTo],
  );

  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      const v = latest.current.view;
      if (!rect) return { x: 0, y: 0 };
      return { x: (clientX - rect.left - v.x) / v.scale, y: (clientY - rect.top - v.y) / v.scale };
    },
    [surfaceRef],
  );

  const panTo = useCallback((x: number, y: number) => setView((v) => ({ ...v, x, y })), []);
  const zoomIn = useCallback(() => zoomBy(ZOOM_STEP), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / ZOOM_STEP), [zoomBy]);

  return {
    view,
    ready,
    zoom: Math.round(view.scale * BASE_ZOOM),
    stopGlide,
    takeControl,
    panTo,
    zoomIn,
    zoomOut,
    zoomTo,
    fit,
    reveal,
    clientToWorld,
  };
}
