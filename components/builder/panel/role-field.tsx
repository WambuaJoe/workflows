"use client";

import { UsersThreeIcon } from "@phosphor-icons/react";
import { Dropdown, MenuItem, MenuSeparator } from "@/components/ui/dropdown";
import { AUDIENCE_ROLES, ROLES, type RoleKey } from "@/lib/flow";
import { ChipGlyph, RoleMenuItems } from "../step-parts";
import { Divider, FieldLabel, SelectButton } from "./fields";
import type { StepPanelProps } from "./types";

type RoleFieldProps = Pick<
  StepPanelProps,
  "step" | "paths" | "onPathRoleChange" | "onAudienceChange"
>;

/** Every step's role control: the answer a path handles, or the roles any other step runs for. */
export function RoleField({ step, paths, onPathRoleChange, onAudienceChange }: RoleFieldProps) {
  return (
    <div className="mb-3">
      {step.match ? (
        <PathRole
          role={step.match}
          taken={paths.map((p) => p.role)}
          onChange={(role) => onPathRoleChange(step.id, role)}
        />
      ) : (
        <Audience
          audience={step.audience ?? []}
          onChange={(roles) => onAudienceChange(step.id, roles)}
        />
      )}
      <Divider className="mt-5 mb-2" />
    </div>
  );
}

function PathRole({
  role,
  taken,
  onChange,
}: {
  role: RoleKey;
  taken: RoleKey[];
  onChange: (role: RoleKey) => void;
}) {
  return (
    <>
      <FieldLabel
        title="Path for"
        hint="People who give this answer to the condition above take this path."
      />
      <Dropdown
        className="mt-2.5 w-full"
        trigger={({ open, toggle, menuId }) => (
          <SelectButton
            open={open}
            menuId={menuId}
            label={`Path for: ${ROLES[role].label}`}
            icon={<ChipGlyph icon={role} size={15} />}
            onClick={toggle}
          >
            <span className="truncate">{ROLES[role].label}</span>
          </SelectButton>
        )}
      >
        {(close) => (
          <RoleMenuItems
            current={role}
            taken={taken}
            onSelect={(next) => {
              onChange(next);
              close();
            }}
          />
        )}
      </Dropdown>
    </>
  );
}

function Audience({
  audience,
  onChange,
}: {
  audience: RoleKey[];
  onChange: (roles: RoleKey[]) => void;
}) {
  const toggle = (role: RoleKey) =>
    onChange(
      audience.includes(role)
        ? audience.filter((r) => r !== role)
        : AUDIENCE_ROLES.filter((r) => r === role || audience.includes(r)),
    );
  const summary = audience.length ? audience.map((r) => ROLES[r].label).join(", ") : "Everyone";

  return (
    <>
      <FieldLabel
        title="Runs for"
        hint="Limit this step to certain roles. Everyone else skips it."
      />
      <Dropdown
        className="mt-2.5 w-full"
        trigger={({ open, toggle: toggleMenu, menuId }) => (
          <SelectButton
            open={open}
            menuId={menuId}
            label={`Runs for: ${summary}`}
            icon={<UsersThreeIcon size={16} weight="fill" className="text-icon" />}
            onClick={toggleMenu}
          >
            {audience.length === 0
              ? "Everyone"
              : audience.map((role) => (
                  <span
                    key={role}
                    className="inline-flex h-[22px] items-center gap-1 rounded-[6px] bg-tint px-1.5 text-[11.5px] font-normal text-ink-soft"
                  >
                    <ChipGlyph icon={role} size={11} />
                    {ROLES[role].label}
                  </span>
                ))}
          </SelectButton>
        )}
      >
        {() => (
          <>
            <MenuItem
              checked={audience.length === 0}
              icon={<UsersThreeIcon size={13} weight="fill" />}
              onSelect={() => onChange([])}
            >
              Everyone
            </MenuItem>
            <MenuSeparator />
            {AUDIENCE_ROLES.map((role) => (
              <MenuItem
                key={role}
                checked={audience.includes(role)}
                icon={<ChipGlyph icon={role} size={13} />}
                onSelect={() => toggle(role)}
              >
                {ROLES[role].label}
              </MenuItem>
            ))}
          </>
        )}
      </Dropdown>
    </>
  );
}
