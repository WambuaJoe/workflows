"use client";

import { motion } from "motion/react";
import { STEP_HEIGHT, STEP_WIDTH } from "@/lib/flow";
import { EASE_OUT } from "@/lib/motion";
import { CHIP_CLASS, StepBadge } from "../step-parts";
import type { DropPreview } from "./flow-canvas";

/** Where a dragged app will land, drawn as a dashed card at the canvas's zoom. */
export function DropGhost({ preview }: { preview: DropPreview }) {
  return (
    <div
      className="pointer-events-none absolute top-0 left-0"
      style={{
        width: STEP_WIDTH,
        transform: `translate(${preview.x}px, ${preview.y}px)`,
        zIndex: 30,
      }}
    >
      <motion.div
        initial={{ opacity: 0, transform: "scale(0.97)" }}
        animate={{ opacity: 1, transform: "scale(1)" }}
        transition={{ duration: 0.15, ease: EASE_OUT }}
      >
        <p className="absolute -top-[21px] left-0 text-[11.5px] leading-4 whitespace-nowrap text-brand">
          Then
        </p>
        <div
          className="flex flex-col rounded-[16px] border border-dashed border-brand/50 bg-white/85 shadow-lift"
          style={{ height: STEP_HEIGHT }}
        >
          <div className="px-4 pt-4">
            <div className="flex h-5 items-center gap-1.5">
              <span className={CHIP_CLASS}>Do this</span>
              <StepBadge step={{ kind: "action", app: preview.app.key }} />
            </div>
            <p className="mt-2 text-[13.5px] font-semibold text-ink">{preview.app.action}</p>
          </div>
          <p className="mt-auto px-4 pb-3.5 text-[11.75px] text-brand">
            {preview.parentId
              ? "Release to add after the highlighted step"
              : "Release to add a separate step"}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
