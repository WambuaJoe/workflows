import { createPath } from "./edits";
import type { Doc } from "./types";

/** The onboarding rule from the design. */
export const INITIAL_DOC: Doc = {
  name: "Onboarding Process",
  // Generated ids count up from here, clear of the fixed ones below.
  nextId: 3,
  conditionType: "New step",
  conditions: [{ id: "condition-1", subject: "User selects", attributes: ["Roles"] }],
  steps: [
    {
      id: "trigger",
      kind: "trigger",
      label: "Starts when",
      x: 233,
      y: 40,
      chip: { label: "Play", icon: "play" },
      title: ["User", { tag: "Sign up" }, "via landing page"],
      panel: {
        title: "User signs up",
        tags: ["Trigger"],
        description:
          "Triggers decide when a rule starts. This one runs each time someone signs up through the landing page.",
      },
    },
    {
      id: "condition",
      kind: "condition",
      label: "New step",
      x: 233,
      y: 264,
      chip: { label: "Do this", icon: "doThis" },
      title: [],
      panel: {
        title: "",
        tags: [],
        description:
          "Use “conditions” to split your flow into different paths and handle each case separately.",
      },
    },
    createPath("path-1", "founder", { x: 233, y: 490 }),
    createPath("path-2", "designer", { x: 518, y: 490 }),
    {
      id: "reminder",
      kind: "action",
      label: "End: No activity > 24h",
      x: 518,
      y: 718,
      chip: { label: "Do this", icon: "doThis" },
      title: ["Send reminder email"],
      panel: {
        title: "Send reminder email",
        tags: ["Email"],
        description:
          "Sends a reminder when the person hasn't been active within 24 hours of signing up.",
      },
    },
  ],
  links: [
    { from: "trigger", to: "condition" },
    { from: "condition", to: "path-1" },
    { from: "condition", to: "path-2" },
    { from: "path-2", to: "reminder" },
  ],
};
