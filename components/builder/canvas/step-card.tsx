"use client";

import { memo, useEffect, type PointerEvent } from "react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { DotsThreeIcon, LightningIcon } from "@phosphor-icons/react";
import { FilterIcon } from "@/components/icons";
import { Dropdown, MenuCaret } from "@/components/ui/dropdown";
import { cn } from "@/lib/cn";
import { ROLES, STEP_HEIGHT, STEP_WIDTH, type RoleKey, type Step } from "@/lib/flow";
import { EASE_OUT } from "@/lib/motion";
import { CHIP_CLASS, ChipGlyph, RoleMenuItems, StepBadge, Tag, stepText } from "../step-parts";

/** A quick, damped side-to-side that reads as "no". */
const SHAKE = [
  "translateX(0px)",
  "translateX(-6px)",
  "translateX(5px)",
  "translateX(-3px)",
  "translateX(2px)",
  "translateX(0px)",
];

const POP = {
  initial: { opacity: 0, transform: "scale(0.9)" },
  animate: { opacity: 1, transform: "scale(1)" },
  exit: { opacity: 0, transform: "scale(0.9)" },
  transition: { duration: 0.15, ease: EASE_OUT },
};

type StepCardProps = {
  step: Step;
  selected: boolean;
  dragging: boolean;
  /** A dragged app would attach here. */
  dropTarget: boolean;
  /** False while panning with the hand tool. */
  interactive: boolean;
  /** Stagger for the first appearance; 0 afterwards. */
  enterDelay: number;
  /** Changes each time an edit to this step is refused. */
  shakeNonce: number;
  /** Roles every path handles, so a path's picker can disable taken ones. */
  takenRoles: RoleKey[];
  onPointerDown: (e: PointerEvent<HTMLDivElement>, step: Step) => void;
  onActivate: (id: string) => void;
  onRoleChange: (id: string, role: RoleKey) => void;
};

/** A step on the canvas. Lifts while dragged and shakes when an edit is refused. */
export const StepCard = memo(function StepCard({
  step,
  selected,
  dragging,
  dropTarget,
  interactive,
  enterDelay,
  shakeNonce,
  takenRoles,
  onPointerDown,
  onActivate,
  onRoleChange,
}: StepCardProps) {
  const [shakeScope, animateShake] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!shakeNonce || reduceMotion || !shakeScope.current) return;
    animateShake(shakeScope.current, { transform: SHAKE }, { duration: 0.4, ease: "easeInOut" });
  }, [shakeNonce, reduceMotion, animateShake, shakeScope]);

  const actionCount = step.actions?.length ?? 0;
  const audience = step.audience ?? [];

  return (
    <div
      data-step
      className="absolute top-0 left-0"
      style={{
        width: STEP_WIDTH,
        transform: `translate(${step.x}px, ${step.y}px)`,
        zIndex: dragging ? 20 : selected ? 2 : 1,
      }}
    >
      <motion.div
        initial={{ opacity: 0, transform: "translateY(8px) scale(0.98)" }}
        animate={{
          opacity: 1,
          transform: "translateY(0px) scale(1)",
          transition: { duration: 0.28, ease: EASE_OUT, delay: enterDelay },
        }}
        exit={{
          opacity: 0,
          transform: "translateY(0px) scale(0.96)",
          transition: { duration: 0.16, ease: EASE_OUT },
        }}
      >
        <p className="pointer-events-none absolute -top-[21px] left-0 text-[11.5px] leading-4 whitespace-nowrap text-muted select-none">
          {step.label}
        </p>
        <div ref={shakeScope}>
          <div
            role="group"
            tabIndex={0}
            aria-roledescription="step"
            aria-label={`${step.label}: ${stepText(step.title)}${selected ? ", selected" : ""}`}
            onPointerDown={interactive ? (e) => onPointerDown(e, step) : undefined}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate(step.id);
              }
            }}
            onFocus={(e) => {
              // Keyboard focus selects too, so the panel and arrow-key nudging follow it.
              if (e.target === e.currentTarget && e.currentTarget.matches(":focus-visible")) {
                onActivate(step.id);
              }
            }}
            style={{ height: STEP_HEIGHT }}
            className={cn(
              "group relative flex flex-col rounded-[16px] border bg-wash transition-[border-color,box-shadow,transform] duration-150 ease-out outline-none select-none",
              selected
                ? "border-brand shadow-[0_0_0_0.5px_var(--color-brand),0_0_0_4px_var(--color-brand-soft)]"
                : dropTarget
                  ? "border-brand/60 shadow-[0_0_0_4px_var(--color-brand-soft)]"
                  : "border-line shadow-card hover:border-line-strong",
              dragging &&
                "shadow-[0_0_0_0.5px_var(--color-brand),0_0_0_4px_var(--color-brand-soft),var(--shadow-lift)] motion-safe:scale-[1.02]",
              interactive && "cursor-pointer",
              "focus-visible:shadow-[0_0_0_0.5px_var(--color-brand),0_0_0_4px_var(--color-brand-soft)]",
            )}
          >
            <div className="h-[80px] shrink-0 rounded-[15px] bg-white px-4 pt-4 shadow-[0_1px_0_var(--color-line),0_4px_10px_-5px_rgb(20_20_18/0.12)]">
              <div className="flex h-5 items-center gap-1.5">
                {step.match ? (
                  <PathRoleChip
                    step={step}
                    role={step.match}
                    takenRoles={takenRoles}
                    onActivate={onActivate}
                    onRoleChange={onRoleChange}
                  />
                ) : (
                  <span className={CHIP_CLASS}>
                    <ChipGlyph icon={step.chip.icon} />
                    {step.chip.label}
                  </span>
                )}
                <StepBadge step={step} />
                <AnimatePresence initial={false}>
                  {audience.length > 0 && (
                    <motion.span
                      key="audience"
                      {...POP}
                      title={`Runs for ${audience.map((r) => ROLES[r].label).join(", ")}`}
                      className="inline-flex h-5 min-w-0 items-center gap-1 rounded-[6px] bg-tint px-1.5 text-[11px] text-ink-soft"
                    >
                      <ChipGlyph icon={audience[0]} size={10} />
                      <span className="truncate">
                        {audience.length === 1
                          ? ROLES[audience[0]].label
                          : `${audience.length} roles`}
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
                <DotsThreeIcon
                  aria-hidden
                  size={18}
                  weight="bold"
                  className="ml-auto text-muted transition-colors duration-150 group-hover:text-ink"
                />
              </div>
              <p className="mt-2 flex h-5 min-w-0 items-center gap-1.5 overflow-hidden text-[13.5px] font-semibold tracking-[-0.005em] whitespace-nowrap text-ink">
                {step.title.map((segment, i) =>
                  typeof segment === "string" ? (
                    <span key={i} className="shrink-0">
                      {segment}
                    </span>
                  ) : (
                    <Tag key={i}>{segment.tag}</Tag>
                  ),
                )}
              </p>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
              <FilterIcon className="shrink-0 text-icon" />
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                {step.tags ? (
                  step.tags.map((tag) => (
                    <Tag key={tag} className="h-[21px] bg-[#e6e6e3] px-2 text-[11px]">
                      {tag}
                    </Tag>
                  ))
                ) : (
                  <span className="truncate text-[11.75px] text-muted">Add filters…</span>
                )}
              </div>
              <AnimatePresence initial={false}>
                {actionCount > 0 && (
                  <motion.span
                    key="actions"
                    {...POP}
                    className="inline-flex h-[21px] shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 text-[11px] font-medium text-brand"
                  >
                    <LightningIcon size={10} weight="fill" />
                    {actionCount} {actionCount === 1 ? "action" : "actions"}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

/** A path's role chip doubles as its role picker. */
function PathRoleChip({
  step,
  role,
  takenRoles,
  onActivate,
  onRoleChange,
}: {
  step: Step;
  role: RoleKey;
  takenRoles: RoleKey[];
  onActivate: (id: string) => void;
  onRoleChange: (id: string, role: RoleKey) => void;
}) {
  return (
    // Keeps presses and keys from the card, which would start a drag or reselect.
    <span
      className="contents"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Dropdown
        className="shrink-0"
        menuClassName="w-[188px]"
        trigger={({ open, toggle, menuId }) => (
          <button
            type="button"
            onClick={() => {
              onActivate(step.id);
              toggle();
            }}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label={`Path for ${step.chip.label}. Change role`}
            title="Choose who this path is for"
            className={cn(
              CHIP_CLASS,
              "pr-1 transition-colors duration-150 hover:border-line-strong hover:bg-hover",
              open && "border-line-strong bg-hover",
            )}
          >
            <ChipGlyph icon={step.chip.icon} />
            {step.chip.label}
            <MenuCaret open={open} size={9} className="text-muted" />
          </button>
        )}
      >
        {(close) => (
          <RoleMenuItems
            current={role}
            taken={takenRoles}
            onSelect={(next) => {
              onRoleChange(step.id, next);
              close();
            }}
          />
        )}
      </Dropdown>
    </span>
  );
}
