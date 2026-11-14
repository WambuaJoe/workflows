"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { APPS } from "@/lib/flow";
import { EASE_OUT } from "@/lib/motion";
import { AppLogo } from "../step-parts";
import type { StepPanelProps } from "./types";

/** Searchable app list. Click adds an app to this step; dragging onto the canvas makes a new step. */
export function LinkApps({
  onAppPointerDown,
  onAppClick,
}: Pick<StepPanelProps, "onAppPointerDown" | "onAppClick">) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const apps = APPS.filter(
    (app) => !q || app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q),
  );

  return (
    <>
      <p className="text-[14px] font-medium">Link another app</p>
      <label className="mt-3 flex h-9 items-center gap-2 rounded-[10px] bg-active px-3 text-subtle transition-shadow duration-150 focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)]">
        <MagnifyingGlassIcon size={17} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search app..."
          aria-label="Search apps"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-subtle"
        />
      </label>
      <ul className="mt-4 flex flex-col gap-4">
        <AnimatePresence initial={false} mode="popLayout">
          {apps.map((app) => (
            <motion.li
              key={app.key}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: EASE_OUT }}
            >
              <button
                type="button"
                title="Click to add to this step, or drag onto the canvas to make a new step"
                onPointerDown={(e) => onAppPointerDown(app, e)}
                onClick={() => onAppClick(app)}
                className="group flex w-full cursor-grab touch-none items-start gap-3 rounded-[10px] text-left active:cursor-grabbing"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-line bg-white shadow-xs transition-[border-color,box-shadow] duration-150 ease-out group-hover:border-line-strong group-hover:shadow-card">
                  <AppLogo app={app.key} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] leading-5 font-medium text-ink">
                    {app.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] leading-[17px] text-muted">
                    {app.description}
                  </span>
                </span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
        {apps.length === 0 && (
          <li className="text-[12px] text-muted">No apps match “{query.trim()}”.</li>
        )}
      </ul>
    </>
  );
}
