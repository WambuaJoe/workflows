import type { PointerEvent } from "react";
import type {
  ActionTemplate,
  AppInfo,
  ConditionRow,
  PathInfo,
  RoleKey,
  Step,
  StepAction,
  StepSettings,
} from "@/lib/flow";

export type StepPanelProps = {
  step: Step;
  conditionType: string;
  onConditionTypeChange: (type: string) => void;
  conditions: ConditionRow[];
  onConditionsChange: (rows: ConditionRow[]) => void;
  onAddConditionRow: () => void;
  onSettingsChange: (id: string, patch: Partial<StepSettings>) => void;
  /** The condition's paths, in order. */
  paths: PathInfo[];
  onSelectStep: (id: string) => void;
  /** Absent once every role has a path. */
  onAddPath?: () => void;
  onPathRoleChange: (id: string, role: RoleKey) => void;
  onAudienceChange: (id: string, roles: RoleKey[]) => void;
  onAddAction: (template: ActionTemplate) => void;
  onActionsChange: (actions: StepAction[]) => void;
  /** An app is being dragged over the "Add action" area. */
  appDropActive: boolean;
  onAppPointerDown: (app: AppInfo, e: PointerEvent<HTMLButtonElement>) => void;
  onAppClick: (app: AppInfo) => void;
  onDelete: () => void;
  onClose: () => void;
};
