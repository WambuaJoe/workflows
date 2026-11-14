"use client";

import { AnimatePresence, motion } from "motion/react";
import { WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { EASE_OUT } from "@/lib/motion";
import type { RefusedEdit } from "./use-rule-editor";

const WIDTH = "min(380px, calc(100% - 32px))";

/** Explains a refused edit, above the toolbar and centred in the visible canvas. */
export function ErrorToast({
  refused,
  inset,
  onDismiss,
}: {
  refused: RefusedEdit | null;
  inset: number;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {refused && (
        <motion.div
          key="refused"
          role="alert"
          initial={{ opacity: 0, transform: "translateY(8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{
            opacity: 0,
            transform: "translateY(6px)",
            transition: { duration: 0.15, ease: EASE_OUT },
          }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="absolute bottom-[92px] z-40"
          style={{ width: WIDTH, left: `calc((100% - ${inset}px - ${WIDTH}) / 2)` }}
        >
          <div className="flex items-start gap-3 rounded-[12px] border border-alert/25 bg-white py-3 pr-2 pl-3.5 shadow-float">
            <WarningCircleIcon size={18} weight="fill" className="mt-px shrink-0 text-alert" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] leading-5 font-semibold">{refused.title}</p>
              <p className="mt-0.5 text-[12px] leading-[17px] text-muted">{refused.message}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={onDismiss}
              className="grid size-7 shrink-0 place-items-center rounded-[7px] text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
            >
              <XIcon size={13} weight="bold" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
