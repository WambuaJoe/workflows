import type { AppInfo } from "./apps";
import type { ActionTemplate, RoleKey } from "./types";

type Role = { label: string; title: string; tags: string[]; description: string };

/** What the path for each answer shows. */
export const ROLES: Record<RoleKey, Role> = {
  founder: {
    label: "Founder",
    title: "Show business dashboard",
    tags: ["Dashboard", "Analytics"],
    description:
      "Runs when the person picks Founder. Opens the business dashboard with analytics pinned.",
  },
  designer: {
    label: "Designer",
    title: "Show design workspace",
    tags: ["Templates", "UI Kits"],
    description:
      "Runs when the person picks Designer. Opens a workspace with templates and UI kits ready to use.",
  },
  developer: {
    label: "Developer",
    title: "Show API quickstart",
    tags: ["Docs", "API keys"],
    description:
      "Runs when the person picks Developer. Opens the quickstart with their API keys ready.",
  },
  marketer: {
    label: "Marketer",
    title: "Show campaign planner",
    tags: ["Campaigns", "Audiences"],
    description:
      "Runs when the person picks Marketer. Opens the campaign planner with a starter audience.",
  },
  product: {
    label: "Product manager",
    title: "Show roadmap board",
    tags: ["Roadmap", "Feedback"],
    description:
      "Runs when the person picks Product manager. Opens a roadmap board with feedback linked.",
  },
  else: {
    label: "Anyone else",
    title: "Show getting started",
    tags: ["Checklist"],
    description: "Runs when the person's answer doesn't match any of the other paths.",
  },
};

export const ROLE_ORDER: RoleKey[] = [
  "founder",
  "designer",
  "developer",
  "marketer",
  "product",
  "else",
];

/** Roles a step can be limited to. "Anyone else" only makes sense as a path. */
export const AUDIENCE_ROLES: RoleKey[] = ROLE_ORDER.filter((role) => role !== "else");

export const CONDITION_TYPES = ["New step", "Wait for event", "Time delay"];
export const CONDITION_SUBJECTS = ["User selects", "User property", "Event occurred"];
export const CONDITION_ATTRIBUTES = ["Roles", "Plan", "Team size", "Country"];

/** Built-in actions a step can run. */
export const ACTION_TEMPLATES: ActionTemplate[] = [
  { kind: "email", label: "Send email", detail: "Welcome series, day 1" },
  { kind: "message", label: "Show in-app message", detail: "Banner on next visit" },
  { kind: "tag", label: "Add tag", detail: "onboarding-started" },
  { kind: "wait", label: "Wait", detail: "1 day" },
  { kind: "notify", label: "Notify team", detail: "Growth team" },
];

/** The action a linked app adds to a step. */
export function appAction(app: AppInfo): ActionTemplate {
  return { kind: "app", app: app.key, label: app.action, detail: app.name };
}
