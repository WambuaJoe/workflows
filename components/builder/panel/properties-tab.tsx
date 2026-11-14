"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { StepBadge, Tag } from "../step-parts";
import { ActionsSection } from "./actions-section";
import { ConditionFields } from "./condition-fields";
import { Divider } from "./fields";
import { LinkApps } from "./link-apps";
import { PathsList } from "./paths-list";
import { RoleField } from "./role-field";
import type { StepPanelProps } from "./types";

export function PropertiesTab(props: StepPanelProps) {
  const { step, onDelete } = props;

  return (
    <>
      <section className="border-b border-line px-4 pt-5 pb-5">
        <div className="flex items-center gap-3">
          <StepBadge step={step} size="lg" />
          <h2 className="truncate text-[17px] font-semibold tracking-[-0.01em]">
            {step.panel.title}
          </h2>
          {step.panel.tags.map((tag) => (
            <Tag key={tag} className="h-[21px] text-[11px]">
              {tag}
            </Tag>
          ))}
          <button
            type="button"
            aria-label="Delete step"
            title="Delete step (Delete)"
            onClick={onDelete}
            className="-mr-1.5 ml-auto grid size-8 shrink-0 place-items-center rounded-[8px] text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
          >
            <TrashIcon size={17} weight="fill" />
          </button>
        </div>
        <p className="mt-3 text-[11.5px] leading-[16.5px] text-muted">
          {step.panel.description}{" "}
          <a href="#" className="font-medium text-brand hover:underline">
            Learn more
          </a>
        </p>
      </section>

      <div className="px-4 pt-5 pb-6">
        <RoleField {...props} />
        {step.kind === "condition" && (
          <>
            <ConditionFields conditions={props.conditions} onChange={props.onConditionsChange} />
            <PathsList paths={props.paths} onSelect={props.onSelectStep} onAdd={props.onAddPath} />
          </>
        )}
        <ActionsSection
          actions={step.actions ?? []}
          onAdd={props.onAddAction}
          onChange={props.onActionsChange}
          dropActive={props.appDropActive}
        />
        <Divider className="my-5" />
        <LinkApps onAppPointerDown={props.onAppPointerDown} onAppClick={props.onAppClick} />
      </div>
    </>
  );
}
