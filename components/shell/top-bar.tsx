"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BellIcon, CheckIcon } from "@phosphor-icons/react";
import { InviteIcon, ShareIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { EASE_OUT } from "@/lib/motion";

const COLLABORATORS = [
  { initials: "KT", name: "Kai Turner", className: "bg-[#dde8ea] text-[#3e7384]" },
  { initials: "HS", name: "Hana Silva", className: "bg-[#fce7d4] text-[#e3893a]" },
  { initials: "JP", name: "Jules Park", className: "bg-[#d3f3fc] text-[#1fa8d4]" },
];

const swap = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: EASE_OUT },
} as const;

type TopBarProps = {
  name: string;
  status: "Draft" | "Saved";
  onSave: () => void;
};

export function TopBar({ name, status, onSave }: TopBarProps) {
  const [copied, setCopied] = useState(false);
  const [unread, setUnread] = useState(true);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (insecure context, denied permission); nothing to recover.
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-4">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13.5px]">
        <a href="#" className="shrink-0 text-muted transition-colors duration-150 hover:text-ink">
          Automations
        </a>
        <Slash />
        <a href="#" className="shrink-0 text-muted transition-colors duration-150 hover:text-ink">
          Rules
        </a>
        <Slash />
        <span aria-current="page" className="truncate font-medium text-ink">
          {name}
        </span>
        <span
          aria-live="polite"
          className={cn(
            "relative inline-grid h-[21px] shrink-0 place-items-center overflow-hidden rounded-[6px] px-2 text-[11.5px] transition-colors duration-200 ease-out",
            status === "Saved" ? "bg-success-soft text-success" : "bg-tint text-muted",
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={status} {...swap}>
              {status}
            </motion.span>
          </AnimatePresence>
        </span>
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        <ul className="hidden -space-x-1 sm:flex" aria-label="People editing">
          {COLLABORATORS.map((person) => (
            <li
              key={person.initials}
              title={person.name}
              className={cn(
                "grid size-8 place-items-center rounded-[9px] text-[12px] font-medium ring-2 ring-white",
                person.className,
              )}
            >
              <span aria-hidden>{person.initials}</span>
              <span className="sr-only">{person.name}</span>
            </li>
          ))}
        </ul>
        <IconButton label="Invite people">
          <InviteIcon />
        </IconButton>
        <span aria-hidden className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <IconButton
          label={unread ? "Notifications, 1 unread" : "Notifications"}
          onClick={() => setUnread(false)}
        >
          <span className="relative">
            <BellIcon size={17} weight="fill" />
            <AnimatePresence>
              {unread && (
                <motion.span
                  exit={{ opacity: 0, transform: "scale(0.5)" }}
                  transition={{ duration: 0.15, ease: EASE_OUT }}
                  className="absolute -top-1 -right-0.5 size-2 rounded-full bg-alert ring-2 ring-white"
                />
              )}
            </AnimatePresence>
          </span>
        </IconButton>
        <button
          type="button"
          onClick={share}
          className="flex h-9 items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 text-[14px] font-medium shadow-xs transition-[background-color,transform] duration-150 ease-out hover:bg-hover motion-safe:active:scale-[0.97]"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={copied ? "copied" : "share"}
              {...swap}
              className="flex items-center gap-2"
            >
              {copied ? (
                <CheckIcon size={16} weight="bold" className="text-success" />
              ) : (
                <ShareIcon />
              )}
              <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
            </motion.span>
          </AnimatePresence>
        </button>
        <button
          type="button"
          onClick={onSave}
          className="h-[38px] rounded-[10px] bg-gradient-to-b from-[#256a81] to-brand px-4 text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(16_50_62/0.3)] transition-[filter,transform] duration-150 ease-out hover:brightness-110 motion-safe:active:scale-[0.97]"
        >
          Save Rule
        </button>
      </div>
    </header>
  );
}

function Slash() {
  return (
    <span aria-hidden className="shrink-0 text-line-strong">
      /
    </span>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-[10px] border border-line bg-white text-ink shadow-xs transition-[background-color,transform] duration-150 ease-out hover:bg-hover motion-safe:active:scale-[0.95]"
    >
      {children}
    </button>
  );
}
