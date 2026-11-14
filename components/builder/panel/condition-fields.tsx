"use client";

import { useState } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "motion/react";
import { UserIcon, XIcon } from "@phosphor-icons/react";
import { ConditionIcon } from "@/components/icons";
import { Dropdown, MenuCaret, MenuItem, MenuSeparator } from "@/components/ui/dropdown";
import {
  CONDITION_ATTRIBUTES,
  CONDITION_SUBJECTS,
  CONDITION_TYPES,
  type ConditionRow,
} from "@/lib/flow";
import { EASE_OUT } from "@/lib/motion";
import { Tag } from "../step-parts";
import { AddLink, DRAG_SHADOW, Divider, DragHandle, FieldLabel, SelectField } from "./fields";
import { useReorderable } from "./use-reorderable";

/** The condition's type and its rows, which reorder by their handles. */
export function ConditionFields({
  conditions,
  onChange,
}: {
  conditions: ConditionRow[];
  onChange: (rows: ConditionRow[]) => void;
}) {
  const [type, setType] = useState(CONDITION_TYPES[0]);
  const { order, setOrder, commit, move } = useReorderable(conditions, onChange);

  const updateRow = (id: string, patch: Partial<ConditionRow>) =>
    onChange(conditions.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () =>
    onChange([
      ...conditions,
      { id: crypto.randomUUID(), subject: "User property", attributes: [] },
    ]);

  return (
    <div className="mb-3">
      <FieldLabel title="Condition type" />
      <SelectField
        className="mt-2.5"
        label="Condition type"
        icon={<ConditionIcon size={15} className="text-cyan" />}
        value={type}
        options={CONDITION_TYPES}
        onChange={setType}
      />

      <Divider className="my-4" />

      <Tag className="h-[21px] text-[11px]">{type}</Tag>

      <Reorder.Group
        as="ul"
        axis="y"
        values={order}
        onReorder={setOrder}
        className="mt-3 flex flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {order.map((row) => (
            <ConditionRowItem
              key={row.id}
              row={row}
              canRemove={order.length > 1}
              onUpdate={(patch) => updateRow(row.id, patch)}
              onRemove={() => onChange(conditions.filter((r) => r.id !== row.id))}
              onMove={(by) => move(row.id, by)}
              onDragEnd={commit}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {conditions.length < CONDITION_ATTRIBUTES.length && (
        <AddLink onClick={addRow}>Add condition</AddLink>
      )}
    </div>
  );
}

function ConditionRowItem({
  row,
  canRemove,
  onUpdate,
  onRemove,
  onMove,
  onDragEnd,
}: {
  row: ConditionRow;
  canRemove: boolean;
  onUpdate: (patch: Partial<ConditionRow>) => void;
  onRemove: () => void;
  onMove: (by: -1 | 1) => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="li"
      value={row}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      whileDrag={{ boxShadow: DRAG_SHADOW }}
      className="relative flex items-center rounded-[12px] border border-line bg-white py-2.5 pr-2.5"
    >
      <DragHandle
        controls={controls}
        label={`Reorder “${row.subject}” condition`}
        onMove={onMove}
        className="w-9"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <SelectField
          label="Condition subject"
          icon={<UserIcon size={17} weight="fill" className="text-ink" />}
          value={row.subject}
          options={CONDITION_SUBJECTS}
          onChange={(subject) => onUpdate({ subject })}
          extraItems={
            canRemove
              ? (close) => (
                  <>
                    <MenuSeparator />
                    <MenuItem
                      tone="danger"
                      onSelect={() => {
                        close();
                        onRemove();
                      }}
                    >
                      Remove condition
                    </MenuItem>
                  </>
                )
              : undefined
          }
        />
        <AttributeSelect
          attributes={row.attributes}
          onChange={(attributes) => onUpdate({ attributes })}
        />
      </div>
    </Reorder.Item>
  );
}

/** Multi-select of the attributes a row matches, shown as removable tokens. */
function AttributeSelect({
  attributes,
  onChange,
}: {
  attributes: string[];
  onChange: (attributes: string[]) => void;
}) {
  const toggle = (attribute: string) =>
    onChange(
      attributes.includes(attribute)
        ? attributes.filter((a) => a !== attribute)
        : CONDITION_ATTRIBUTES.filter((a) => a === attribute || attributes.includes(a)),
    );

  return (
    <Dropdown
      className="w-full"
      trigger={({ open, toggle: toggleMenu, menuId }) => (
        <div className="flex h-[38px] items-center gap-1 rounded-[10px] border border-line bg-white pr-1 pl-2 shadow-xs">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              {attributes.length === 0 ? (
                <motion.span
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="truncate pl-1 text-[13px] text-subtle"
                >
                  Choose attributes…
                </motion.span>
              ) : (
                attributes.map((attribute) => (
                  <motion.span
                    key={attribute}
                    layout
                    initial={{ opacity: 0, transform: "scale(0.94)" }}
                    animate={{ opacity: 1, transform: "scale(1)" }}
                    exit={{ opacity: 0, transform: "scale(0.94)" }}
                    transition={{ duration: 0.15, ease: EASE_OUT }}
                    className="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-[6px] bg-tint pr-1 pl-2 text-[11.5px] text-muted"
                  >
                    {attribute}
                    <button
                      type="button"
                      aria-label={`Remove ${attribute}`}
                      onClick={() => onChange(attributes.filter((a) => a !== attribute))}
                      className="grid size-4 place-items-center rounded-[4px] text-muted transition-colors duration-150 hover:bg-line-strong hover:text-ink"
                    >
                      <XIcon size={9} weight="bold" />
                    </button>
                  </motion.span>
                ))
              )}
            </AnimatePresence>
          </div>
          {attributes.length > 0 && (
            <button
              type="button"
              aria-label="Clear attributes"
              title="Clear"
              onClick={() => onChange([])}
              className="grid size-7 shrink-0 place-items-center rounded-[7px] text-ink-soft transition-colors duration-150 hover:bg-hover hover:text-ink"
            >
              <XIcon size={14} weight="bold" />
            </button>
          )}
          <span aria-hidden className="h-4 w-px shrink-0 bg-line" />
          <button
            type="button"
            aria-label="Choose attributes"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            onClick={toggleMenu}
            className="grid size-7 shrink-0 place-items-center rounded-[7px] text-ink-soft transition-colors duration-150 hover:bg-hover hover:text-ink"
          >
            <MenuCaret open={open} />
          </button>
        </div>
      )}
    >
      {() =>
        CONDITION_ATTRIBUTES.map((attribute) => (
          <MenuItem
            key={attribute}
            checked={attributes.includes(attribute)}
            onSelect={() => toggle(attribute)}
          >
            {attribute}
          </MenuItem>
        ))
      }
    </Dropdown>
  );
}
