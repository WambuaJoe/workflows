"use client";

import type { ReactNode } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "motion/react";
import {
  BellIcon,
  ChatCircleTextIcon,
  EnvelopeSimpleIcon,
  HourglassIcon,
  PlusCircleIcon,
  TagIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Dropdown, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/dropdown";
import { cn } from "@/lib/cn";
import {
  ACTION_TEMPLATES,
  APPS,
  appAction,
  type ActionKind,
  type ActionTemplate,
  type StepAction,
} from "@/lib/flow";
import { EASE_OUT } from "@/lib/motion";
import { AppLogo } from "../step-parts";
import { DRAG_SHADOW, DragHandle } from "./fields";
import { useReorderable } from "./use-reorderable";

const ACTION_ICONS: Record<Exclude<ActionKind, "app">, { icon: ReactNode; tone: string }> = {
  email: { icon: <EnvelopeSimpleIcon size={14} weight="fill" />, tone: "bg-cyan-soft text-cyan" },
  message: {
    icon: <ChatCircleTextIcon size={14} weight="fill" />,
    tone: "bg-violet-soft text-violet",
  },
  tag: { icon: <TagIcon size={14} weight="fill" />, tone: "bg-amber-soft text-amber" },
  wait: { icon: <HourglassIcon size={14} weight="fill" />, tone: "bg-cyan-soft text-sky" },
  notify: { icon: <BellIcon size={14} weight="fill" />, tone: "bg-brand-soft text-brand" },
};

function ActionIcon({ action }: { action: ActionTemplate }) {
  if (action.app) {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-[8px] border border-line bg-white">
        <AppLogo app={action.app} size={15} />
      </span>
    );
  }
  const { icon, tone } = ACTION_ICONS[action.kind as Exclude<ActionKind, "app">];
  return (
    <span className={cn("grid size-7 shrink-0 place-items-center rounded-[8px]", tone)}>
      {icon}
    </span>
  );
}

/** The actions a step runs, in order. The dashed box adds more and takes dropped apps. */
export function ActionsSection({
  actions,
  onAdd,
  onChange,
  dropActive,
}: {
  actions: StepAction[];
  onAdd: (template: ActionTemplate) => void;
  onChange: (actions: StepAction[]) => void;
  dropActive: boolean;
}) {
  const { order, setOrder, commit, move } = useReorderable(actions, onChange);
  const compact = actions.length > 0;

  const addItem = (template: ActionTemplate, close: () => void) => (
    <MenuItem
      key={template.app ?? template.kind}
      icon={<ActionIcon action={template} />}
      onSelect={() => {
        onAdd(template);
        close();
      }}
    >
      {template.label}
    </MenuItem>
  );

  return (
    <div>
      <Reorder.Group
        as="ul"
        axis="y"
        values={order}
        onReorder={setOrder}
        aria-label="Actions in this step"
        className={cn("flex flex-col gap-2", compact && "mb-2")}
      >
        <AnimatePresence initial={false}>
          {order.map((action) => (
            <ActionRow
              key={action.id}
              action={action}
              onRemove={() => onChange(actions.filter((a) => a.id !== action.id))}
              onMove={(by) => move(action.id, by)}
              onDragEnd={commit}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      <Dropdown
        className="w-full"
        menuClassName="w-full max-h-[320px] overflow-y-auto"
        trigger={({ open, toggle, menuId }) => (
          <motion.button
            type="button"
            data-action-dropzone
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            initial={false}
            // Tall and empty as in the design; tucks under the list once actions exist.
            animate={{ height: compact ? 44 : 108 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed text-[14px] font-medium text-brand transition-[background-color,border-color] duration-150 ease-out",
              dropActive || open
                ? "border-brand/60 bg-brand-soft/50"
                : "border-line-strong hover:border-brand/40 hover:bg-brand-soft/30",
            )}
          >
            <PlusCircleIcon size={19} weight="fill" />
            {dropActive ? "Drop to add to this step" : "Add action"}
          </motion.button>
        )}
      >
        {(close) => (
          <>
            <MenuLabel>Actions</MenuLabel>
            {ACTION_TEMPLATES.map((template) => addItem(template, close))}
            <MenuSeparator />
            <MenuLabel>Linked apps</MenuLabel>
            {APPS.map((app) => addItem(appAction(app), close))}
          </>
        )}
      </Dropdown>
    </div>
  );
}

function ActionRow({
  action,
  onRemove,
  onMove,
  onDragEnd,
}: {
  action: StepAction;
  onRemove: () => void;
  onMove: (by: -1 | 1) => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="li"
      value={action}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      whileDrag={{ boxShadow: DRAG_SHADOW }}
      className="relative flex h-[52px] items-center gap-2.5 rounded-[12px] border border-line bg-white pr-1.5"
    >
      <DragHandle
        controls={controls}
        label={`Reorder “${action.label}”`}
        onMove={onMove}
        className="-mr-1 w-8"
      />
      <ActionIcon action={action} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] leading-[18px] font-medium">{action.label}</p>
        <p className="truncate text-[11.5px] leading-4 text-muted">{action.detail}</p>
      </div>
      <button
        type="button"
        aria-label={`Remove “${action.label}”`}
        title="Remove"
        onClick={onRemove}
        className="grid size-7 shrink-0 place-items-center rounded-[7px] text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
      >
        <XIcon size={13} weight="bold" />
      </button>
    </Reorder.Item>
  );
}
