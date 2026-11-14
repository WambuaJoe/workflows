"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Edge } from "@/lib/flow";
import { EASE_OUT } from "@/lib/motion";

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      markerUnits="userSpaceOnUse"
      orient="auto"
    >
      <path d="M1 1.5 9 5 1 8.5z" fill={color} />
    </marker>
  );
}

/** The lines between steps: they draw in on entry and fade on removal. A dashed one previews a drop. */
export function Connectors({
  edges,
  intro,
  preview,
}: {
  edges: Edge[];
  /** Stagger the first draw-in after the cards. */
  intro: boolean;
  preview: string | null;
}) {
  return (
    <svg
      aria-hidden
      width="1"
      height="1"
      className="pointer-events-none absolute top-0 left-0 overflow-visible"
    >
      <defs>
        <ArrowMarker id="flow-arrow" color="var(--color-edge)" />
        <ArrowMarker id="flow-arrow-brand" color="var(--color-brand)" />
      </defs>
      <AnimatePresence>
        {edges.map((edge, i) => (
          <motion.path
            key={edge.id}
            d={edge.d}
            fill="none"
            stroke="var(--color-edge)"
            strokeWidth={1.25}
            markerEnd="url(#flow-arrow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: 1,
              transition: {
                duration: 0.32,
                ease: EASE_OUT,
                delay: intro ? 0.18 + i * 0.035 : 0.06,
              },
            }}
            exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }}
          />
        ))}
      </AnimatePresence>
      {preview && (
        <path
          d={preview}
          fill="none"
          stroke="var(--color-brand)"
          strokeOpacity={0.6}
          strokeWidth={1.25}
          strokeDasharray="4 4"
          markerEnd="url(#flow-arrow-brand)"
        />
      )}
    </svg>
  );
}
