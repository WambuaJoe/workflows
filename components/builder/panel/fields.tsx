"use client";

import type { ReactNode } from "react";
import type { DragControls } from "motion/react";
import { DotsSixVerticalIcon, PlusIcon } from "@phosphor-icons/react";
import { Dropdown, MenuCaret, MenuItem } from "@/components/ui/dropdown";
import { cn } from "@/lib/cn";

/** Lift shadow for rows being dragged. */
export const DRAG_SHADOW = "0 2px 6px rgb(20 20 18 / 0.06), 0 18px 36px -14px rgb(20 20 18 / 0.3)";

export function FieldLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <p className="text-[14px] font-medium">{title}</p>
      {hint && <p className="mt-1 text-[11.5px] leading-4 text-muted">{hint}</p>}
    </>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-line", className)} />;
}

/** A trigger that looks like a select box. */
export function SelectButton({
  open,
  menuId,
  label,
  icon,
  onClick,
  children,
}: {
  open: boolean;
  menuId: string;
  /** Accessible name, including the current value. */
  label: string;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      className="flex min-h-[38px] w-full items-center gap-2.5 rounded-[10px] border border-line bg-white py-1.5 pr-2.5 pl-3 text-left text-[14px] font-medium shadow-xs transition-colors duration-150 hover:bg-hover"
    >
      <span className="grid size-5 shrink-0 place-items-center">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">{children}</span>
      <MenuCaret open={open} className="text-ink-soft" />
    </button>
  );
}

/** A single-choice select. `extraItems` renders below the options. */
export function SelectField({
  label,
  icon,
  value,
  options,
  onChange,
  className,
  extraItems,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
  extraItems?: (close: () => void) => ReactNode;
}) {
  return (
    <Dropdown
      className={cn("w-full", className)}
      trigger={({ open, toggle, menuId }) => (
        <SelectButton
          open={open}
          menuId={menuId}
          label={`${label}: ${value}`}
          icon={icon}
          onClick={toggle}
        >
          <span className="truncate">{value}</span>
        </SelectButton>
      )}
    >
      {(close) => (
        <>
          {options.map((option) => (
            <MenuItem
              key={option}
              checked={option === value}
              onSelect={() => {
                onChange(option);
                close();
              }}
            >
              {option}
            </MenuItem>
          ))}
          {extraItems?.(close)}
        </>
      )}
    </Dropdown>
  );
}

/** Drags its row; arrow keys move the row for keyboard users. */
export function DragHandle({
  controls,
  label,
  onMove,
  className,
}: {
  controls: DragControls;
  label: string;
  onMove: (by: -1 | 1) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}. Drag, or use the arrow keys.`}
      title="Drag to reorder"
      onPointerDown={(e) => {
        e.preventDefault();
        controls.start(e);
      }}
      onKeyDown={(e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        onMove(e.key === "ArrowUp" ? -1 : 1);
      }}
      className={cn(
        "grid shrink-0 cursor-grab touch-none place-items-center self-stretch rounded-l-[11px] text-subtle transition-colors duration-150 hover:text-ink-soft active:cursor-grabbing",
        className,
      )}
    >
      <DotsSixVerticalIcon size={16} weight="bold" />
    </button>
  );
}

/** Small brand-coloured "+ Add …" button. */
export function AddLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-[8px] px-1.5 text-[12.5px] font-medium text-brand transition-colors duration-150 hover:bg-brand-soft/50"
    >
      <PlusIcon size={12} weight="bold" />
      {children}
    </button>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">{label}</p>
        <p className="mt-0.5 text-[11.5px] leading-[17px] text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-out",
          checked ? "bg-brand" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform duration-200 ease-out motion-reduce:transition-none",
            checked && "translate-x-4",
          )}
        />
      </button>
    </div>
  );
}
