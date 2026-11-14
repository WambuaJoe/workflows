"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { EASE_OUT } from "@/lib/motion";

type TriggerProps = { open: boolean; toggle: () => void; menuId: string };

type DropdownProps = {
  trigger: (props: TriggerProps) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  side?: "top" | "bottom";
  className?: string;
  menuClassName?: string;
};

const ORIGINS = {
  "bottom-start": "top left",
  "bottom-end": "top right",
  "top-start": "bottom left",
  "top-end": "bottom right",
} as const;

const ITEM_SELECTOR = '[role^="menuitem"]:not(:disabled)';

/** A menu that grows out of its trigger. Arrow keys move between items; Escape returns to the trigger. */
export function Dropdown({
  trigger,
  children,
  align = "start",
  side = "bottom",
  className,
  menuClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const menu = menuRef.current;
    // Capture phase, so presses that something else stops (a card starting a drag) still close it.
    const onPointerDown = (e: PointerEvent) => {
      if (!root?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const frame = requestAnimationFrame(() =>
      menu?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus({ preventScroll: true }),
    );
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      // Closing from inside the menu hands focus back to the trigger.
      if (menu?.contains(document.activeElement)) {
        root?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
      }
    };
  }, [open]);

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();
    switch (e.key) {
      case "ArrowDown":
        focusAt(index + 1);
        break;
      case "ArrowUp":
        focusAt(index <= 0 ? items.length - 1 : index - 1);
        break;
      case "Home":
        focusAt(0);
        break;
      case "End":
        focusAt(items.length - 1);
        break;
      case "Escape":
        close();
        break;
      case "Tab":
        setOpen(false);
        return;
      default:
        return;
    }
    // Handled here, so canvas shortcuts (arrow nudging) don't also fire.
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {trigger({ open, toggle: () => setOpen((o) => !o), menuId })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            onKeyDown={onMenuKeyDown}
            initial={{ opacity: 0, transform: "scale(0.96)" }}
            animate={{ opacity: 1, transform: "scale(1)" }}
            exit={{
              opacity: 0,
              transform: "scale(0.96)",
              transition: { duration: 0.12, ease: EASE_OUT },
            }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            style={{ transformOrigin: ORIGINS[`${side}-${align}`] }}
            className={cn(
              "absolute z-50 scrollbar-subtle min-w-full rounded-[12px] border border-line bg-white p-1 shadow-float",
              side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
              align === "start" ? "left-0" : "right-0",
              menuClassName,
            )}
          >
            {children(close)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type MenuItemProps = {
  children: ReactNode;
  onSelect: () => void;
  checked?: boolean;
  icon?: ReactNode;
  hint?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
};

export function MenuItem({
  children,
  onSelect,
  checked,
  icon,
  hint,
  tone = "default",
  disabled,
}: MenuItemProps) {
  const checkable = checked !== undefined;
  return (
    <button
      type="button"
      role={checkable ? "menuitemcheckbox" : "menuitem"}
      aria-checked={checkable ? checked : undefined}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-[8px] px-2.5 text-left text-[13px] whitespace-nowrap transition-colors duration-100 hover:bg-hover focus-visible:bg-hover focus-visible:outline-none disabled:cursor-not-allowed disabled:text-subtle disabled:hover:bg-transparent",
        tone === "danger" ? "text-alert" : "text-ink",
      )}
    >
      {icon && <span className="shrink-0 text-muted">{icon}</span>}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-[11.5px] text-subtle">{hint}</span>}
      {checkable && (
        <CheckIcon size={14} weight="bold" className={cn("text-brand", !checked && "invisible")} />
      )}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="-mx-1 my-1 h-px bg-line" />;
}

/** Small uppercase heading inside a menu. */
export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p
      role="presentation"
      className="px-2.5 pt-1.5 pb-1 text-[10.5px] tracking-[0.06em] text-subtle uppercase"
    >
      {children}
    </p>
  );
}

/** Caret that flips while its menu is open. */
export function MenuCaret({
  open,
  size = 14,
  className,
}: {
  open: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <CaretDownIcon
      size={size}
      weight="bold"
      className={cn(
        "shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none",
        open && "rotate-180",
        className,
      )}
    />
  );
}
