"use client";

import { motion } from "motion/react";
import { PlusIcon } from "@phosphor-icons/react";
import { ADD_BUTTON_SIZE, type AddButton } from "@/lib/flow";
import { EASE_OUT } from "@/lib/motion";

/** The "+" under the last step of a path. */
export function AddStepButton({
  button,
  delay,
  onAdd,
}: {
  button: AddButton;
  delay: number;
  onAdd: (parentId: string) => void;
}) {
  return (
    <div
      data-control
      className="absolute top-0 left-0"
      style={{ transform: `translate(${button.x}px, ${button.y}px)` }}
    >
      <motion.button
        type="button"
        aria-label="Add step"
        title="Add step"
        onClick={() => onAdd(button.parentId)}
        initial={{ opacity: 0, transform: "scale(0.9)" }}
        animate={{
          opacity: 1,
          transform: "scale(1)",
          transition: { duration: 0.2, ease: EASE_OUT, delay },
        }}
        exit={{
          opacity: 0,
          transform: "scale(0.9)",
          transition: { duration: 0.12, ease: EASE_OUT },
        }}
        whileTap={{ transform: "scale(0.95)", transition: { duration: 0.12, ease: EASE_OUT } }}
        style={{ width: ADD_BUTTON_SIZE, height: ADD_BUTTON_SIZE }}
        className="grid place-items-center rounded-[12px] border border-line bg-white text-muted shadow-card transition-[color,border-color,box-shadow] duration-150 ease-out hover:border-line-strong hover:text-ink hover:shadow-float"
      >
        <PlusIcon size={20} />
      </motion.button>
    </div>
  );
}
