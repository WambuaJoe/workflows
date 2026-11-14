"use client";

import type { ReactNode } from "react";
import {
  CodeIcon,
  KanbanIcon,
  LightningIcon,
  MegaphoneIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import {
  ConditionIcon,
  DesignerIcon,
  DoThisIcon,
  ForkIcon,
  FounderIcon,
  PathsIcon,
  PlayIcon,
} from "@/components/icons";
import { MenuGroup, MenuItem } from "@/components/ui/dropdown";
import { cn } from "@/lib/cn";
import {
  APP_BY_KEY,
  ROLES,
  ROLE_ORDER,
  type AppKey,
  type ChipIcon,
  type RoleKey,
  type Segment,
  type Step,
  type StepKind,
} from "@/lib/flow";

// Chip icons render at their default size unless one is given.
const CHIP_ICONS: Record<ChipIcon, (size?: number) => ReactNode> = {
  play: (s) => <PlayIcon size={s} />,
  doThis: (s) => <DoThisIcon size={s} />,
  founder: (s) => <FounderIcon size={s} />,
  designer: (s) => <DesignerIcon size={s} />,
  developer: (s) => <CodeIcon size={s ?? 12} weight="bold" />,
  marketer: (s) => <MegaphoneIcon size={s ?? 12} weight="fill" />,
  product: (s) => <KanbanIcon size={s ?? 12} weight="fill" />,
  else: (s) => <UsersThreeIcon size={s ?? 13} weight="fill" />,
};

const KIND_BADGES: Record<StepKind, { tone: string; icon: (large: boolean) => ReactNode }> = {
  trigger: {
    tone: "bg-cyan-soft text-sky",
    icon: (large) => <LightningIcon size={large ? 18 : 12} weight="fill" />,
  },
  condition: {
    tone: "bg-cyan-soft text-cyan",
    icon: (large) => <ConditionIcon size={large ? 17 : undefined} />,
  },
  path: {
    tone: "bg-violet-soft text-violet",
    icon: (large) => <PathsIcon size={large ? 17 : undefined} />,
  },
  action: {
    tone: "bg-amber-soft text-amber",
    icon: (large) => <ForkIcon size={large ? 17 : undefined} />,
  },
};

export const CHIP_CLASS =
  "inline-flex h-5 items-center gap-1 rounded-[6px] border border-line bg-white px-1.5 text-[12px] font-medium leading-none text-ink shadow-xs";

export function ChipGlyph({ icon, size }: { icon: ChipIcon; size?: number }) {
  return <>{CHIP_ICONS[icon](size)}</>;
}

/** A linked app's brand mark. */
export function AppLogo({ app, size }: { app: AppKey; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote SVG brand mark, nothing to optimise
    <img
      src={APP_BY_KEY[app].icon}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

/** The badge beside a step's chip: its kind's glyph, or the app it runs. */
export function StepBadge({
  step,
  size = "sm",
}: {
  step: Pick<Step, "kind" | "app">;
  size?: "sm" | "lg";
}) {
  const box = size === "sm" ? "size-5 rounded-[6px]" : "size-8 rounded-[9px]";
  if (step.app) {
    return (
      <span className={cn("grid shrink-0 place-items-center border border-line bg-white", box)}>
        <AppLogo app={step.app} size={size === "sm" ? 12 : 18} />
      </span>
    );
  }
  const badge = KIND_BADGES[step.kind];
  return (
    <span className={cn("grid shrink-0 place-items-center", badge.tone, box)}>
      {badge.icon(size === "lg")}
    </span>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-[6px] bg-tint px-2 text-[11.5px] font-normal text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function stepText(segments: Segment[]) {
  return segments.map((s) => (typeof s === "string" ? s : s.tag)).join(" ");
}

/** Role choices for a path. Roles other paths already handle are shown but disabled. */
export function RoleMenuItems({
  current,
  taken,
  onSelect,
}: {
  current: RoleKey;
  taken: RoleKey[];
  onSelect: (role: RoleKey) => void;
}) {
  return (
    <MenuGroup label="Path for">
      {ROLE_ORDER.map((role) => {
        const inUse = role !== current && taken.includes(role);
        return (
          <MenuItem
            key={role}
            checked={role === current}
            disabled={inUse}
            hint={inUse ? "In use" : undefined}
            icon={<ChipGlyph icon={role} size={13} />}
            onSelect={() => onSelect(role)}
          >
            {ROLES[role].label}
          </MenuItem>
        );
      })}
    </MenuGroup>
  );
}
