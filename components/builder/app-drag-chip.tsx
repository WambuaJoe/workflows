"use client";

import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT } from "@/lib/motion";
import { StepBadge } from "./step-parts";
import type { AppDrag } from "./use-app-drag";

/** Follows the pointer while an app is dragged off the canvas. Over it, the canvas shows a preview instead. */
export function AppDragChip({ drag }: { drag: AppDrag | null }) {
  return (
    <AnimatePresence>
      {drag && !drag.preview && (
        <div
          key="app-drag-chip"
          className="pointer-events-none fixed top-0 left-0 z-[100]"
          style={{ transform: `translate(${drag.clientX + 14}px, ${drag.clientY + 10}px)` }}
        >
          <motion.div
            initial={{ opacity: 0, transform: "scale(0.96)" }}
            animate={{ opacity: 1, transform: "scale(1)" }}
            exit={{ opacity: 0, transform: "scale(0.96)" }}
            transition={{ duration: 0.15, ease: EASE_OUT }}
            className="flex items-center gap-2.5 rounded-[12px] border border-line bg-white py-2 pr-3.5 pl-2 shadow-lift"
          >
            <StepBadge step={{ kind: "action", app: drag.app.key }} size="lg" />
            <span>
              <span className="block text-[13.5px] leading-5 font-semibold">{drag.app.action}</span>
              <span className="block text-[11.5px] leading-4 text-muted">
                {drag.overStep ? "Add to this step" : "Drop on the canvas for a new step"}
              </span>
            </span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
