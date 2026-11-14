"use client";

import { DEFAULT_SETTINGS } from "@/lib/flow";
import { Toggle } from "./fields";
import { RoleField } from "./role-field";
import type { StepPanelProps } from "./types";

export function SettingsTab(props: StepPanelProps) {
  const { step, onSettingsChange } = props;
  const settings = { ...DEFAULT_SETTINGS, ...step.settings };

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div className="-mb-5">
        <RoleField {...props} />
      </div>
      <Toggle
        label="Run once per person"
        description="Skip this step if the person has already been through it."
        checked={settings.oncePerPerson}
        onChange={(oncePerPerson) => onSettingsChange(step.id, { oncePerPerson })}
      />
      <Toggle
        label="Pause rule on error"
        description="Stop the rule and notify editors if this step fails."
        checked={settings.pauseOnError}
        onChange={(pauseOnError) => onSettingsChange(step.id, { pauseOnError })}
      />
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">Notes</span>
        <textarea
          rows={4}
          value={settings.notes}
          onChange={(e) => onSettingsChange(step.id, { notes: e.target.value })}
          placeholder="Add context for your team…"
          className="resize-none rounded-[10px] border border-line px-3 py-2 text-[13px] leading-5 shadow-xs transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-subtle focus:border-line-strong focus:shadow-[0_0_0_3px_var(--color-brand-soft)]"
        />
      </label>
    </div>
  );
}
