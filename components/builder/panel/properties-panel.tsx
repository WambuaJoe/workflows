"use client";

import { useId, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { EASE_DRAWER, EASE_OUT } from "@/lib/motion";
import { PropertiesTab } from "./properties-tab";
import { SettingsTab } from "./settings-tab";
import type { StepPanelProps } from "./types";

export const PANEL_WIDTH = 356;
/** Gap to the window's right edge; matches the top bar's padding so the panel lines up with Save Rule. */
export const PANEL_GUTTER = 16;
/** Horizontal space the open panel takes from the canvas. */
export const PANEL_INSET = PANEL_WIDTH + PANEL_GUTTER;

type Tab = "properties" | "settings";

/** The selected step's panel. Slides in from the right; content fades when the step or tab changes. */
export function PropertiesPanel(props: StepPanelProps) {
  const [tab, setTab] = useState<Tab>("properties");
  const id = useId();

  return (
    <motion.aside
      aria-label="Step properties"
      initial={{ opacity: 0, transform: "translateX(16px)" }}
      animate={{ opacity: 1, transform: "translateX(0px)" }}
      exit={{
        opacity: 0,
        transform: "translateX(16px)",
        transition: { duration: 0.18, ease: EASE_OUT },
      }}
      transition={{ duration: 0.26, ease: EASE_DRAWER }}
      style={{ width: PANEL_WIDTH, right: PANEL_GUTTER }}
      className="absolute top-[18px] bottom-[18px] z-30 flex max-w-[calc(100%-32px)] flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-float"
    >
      <div className="flex h-[43px] shrink-0 items-center gap-5 border-b border-line px-4">
        <div role="tablist" aria-label="Panel sections" className="flex items-center gap-5">
          <PanelTab id={id} tab="properties" current={tab} onSelect={setTab}>
            Properties
          </PanelTab>
          <PanelTab id={id} tab="settings" current={tab} onSelect={setTab}>
            Settings
          </PanelTab>
        </div>
        <button
          type="button"
          aria-label="Close panel"
          title="Close"
          onClick={props.onClose}
          className="-mr-1.5 ml-auto grid size-7 place-items-center rounded-[8px] text-ink-soft transition-colors duration-150 hover:bg-hover hover:text-ink"
        >
          <XIcon size={15} weight="bold" />
        </button>
      </div>

      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${tab}`}
        className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <motion.div
          key={`${props.step.id}-${tab}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
        >
          {tab === "properties" ? <PropertiesTab {...props} /> : <SettingsTab {...props} />}
        </motion.div>
      </div>
    </motion.aside>
  );
}

function PanelTab({
  id,
  tab,
  current,
  onSelect,
  children,
}: {
  id: string;
  tab: Tab;
  current: Tab;
  onSelect: (tab: Tab) => void;
  children: ReactNode;
}) {
  const active = tab === current;
  return (
    <button
      type="button"
      role="tab"
      id={`${id}-${tab}`}
      aria-selected={active}
      aria-controls={`${id}-panel`}
      onClick={() => onSelect(tab)}
      className={cn(
        "text-[14px] font-medium transition-colors duration-150",
        active ? "text-ink" : "text-subtle hover:text-ink-soft",
      )}
    >
      {children}
    </button>
  );
}
