"use client";

import { useState } from "react";
import { Toggle } from "./fields";
import { RoleField } from "./role-field";
import type { StepPanelProps } from "./types";

export function SettingsTab(props: StepPanelProps) {
  const [oncePerPerson, setOncePerPerson] = useState(true);
  const [pauseOnError, setPauseOnError] = useState(false);

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div className="-mb-5">
        <RoleField {...props} />
      </div>
      <Toggle
        label="Run once per person"
        description="Skip this step if the person has already been through it."
        checked={oncePerPerson}
        onChange={setOncePerPerson}
      />
      <Toggle
        label="Pause rule on error"
        description="Stop the rule and notify editors if this step fails."
        checked={pauseOnError}
        onChange={setPauseOnError}
      />
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">Notes</span>
        <textarea
          rows={4}
          placeholder="Add context for your team…"
          className="resize-none rounded-[10px] border border-line px-3 py-2 text-[13px] leading-5 shadow-xs transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-subtle focus:border-line-strong focus:shadow-[0_0_0_3px_var(--color-brand-soft)]"
        />
      </label>
    </div>
  );
}
