"use client";

import { AnimatePresence, motion } from "motion/react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { ROLES, type PathInfo } from "@/lib/flow";
import { EASE_OUT } from "@/lib/motion";
import { ChipGlyph, Tag } from "../step-parts";
import { AddLink, Divider } from "./fields";

/** On the condition: its paths, each opening its step, and a way to add another. */
export function PathsList({
  paths,
  onSelect,
  onAdd,
}: {
  paths: PathInfo[];
  onSelect: (id: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div className="mb-5">
      <Divider className="my-4" />
      <div className="flex items-baseline justify-between">
        <p className="text-[14px] font-medium">Paths</p>
        <span className="text-[11.5px] text-muted tabular-nums">{paths.length}</span>
      </div>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {paths.map((path) => (
            <motion.li
              key={path.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: EASE_OUT }}
            >
              <button
                type="button"
                onClick={() => onSelect(path.id)}
                className="group flex h-10 w-full items-center gap-2.5 rounded-[10px] border border-line bg-white px-2.5 text-left shadow-xs transition-colors duration-150 hover:bg-hover"
              >
                <Tag className="h-5 min-w-[44px] justify-center text-[11px]">{path.prefix}</Tag>
                <span className="grid size-5 shrink-0 place-items-center text-ink">
                  <ChipGlyph icon={path.role} size={14} />
                </span>
                <span className="flex-1 truncate text-[13.5px] font-medium">
                  {ROLES[path.role].label}
                </span>
                <CaretRightIcon
                  size={13}
                  weight="bold"
                  className="shrink-0 text-muted transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {onAdd && <AddLink onClick={onAdd}>Add path</AddLink>}
    </div>
  );
}
