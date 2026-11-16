# Workflows Repository — Build Handoff Context

## Purpose of this document

This document is a handoff brief for another coding agent that will continue building the GitHub repository `WambuaJoe/workflows`. It describes the current product, repository structure, implementation architecture, user experience, domain model, supported interactions, current limitations, validation status, and recommended build direction.

The source of truth is the repository itself:

- Fork: [WambuaJoe/workflows](https://github.com/WambuaJoe/workflows)

- Parent: `AdamJBurns/workflows`

- Default branch: `main`

- License: MIT

- Latest inspected commit: `9fe29f468d7720d77bd92be86f38e96240318981`

- Latest inspected commit message: `Fix issues from code review`

- Latest inspected commit author: Adam B

- Repository description: `A drag-and-drop builder for automation rules, built with Next.js, React and Motion.`

The repository is a front-end prototype for a visual automation-rule builder. It is not yet a connected automation platform: there is no backend, authentication, database, workflow execution engine, persistence, API layer, or real third-party app integration.

---

## Short troubleshooting history

The user cloned the repository into WSL and initially received `ERR_CONNECTION_REFUSED` from Brave for `localhost:3000` and the displayed network address.

The issue was not a repository compilation problem. The development server was either not running, dependencies had been removed/missing, or commands were being run from the wrong directory. Evidence included:

- `ss -ltnp | grep ':3000'` returned no listener.

- `curl http://127.0.0.1:3000` returned connection refused.

- At one point `npm` looked for `/home/takumi/package.json`, because the command was launched from the WSL home directory rather than the repository.

- At another point `next: not found` appeared because `node_modules` was absent.

- There was also a typo: `pm` instead of `npm`, and later `locahost` instead of `localhost`.

The resolution was to run the commands from the repository, restore dependencies if necessary, and keep the foreground development server running:

```bash
cd ~/.ssh/projects/workflows
npm ci
npm run dev -- --hostname 0.0.0.0
```

The final diagnostic proved the application was healthy:

```
TcpTestSucceeded : True
HTTP/1.1 200 OK
X-Powered-By: Next.js
```

The IPv6 warning for `::1` was harmless because Windows successfully fell back to IPv4 `127.0.0.1`. The working browser URLs are:

```
http://localhost:3000
http://127.0.0.1:3000
```

The WSL terminal running Next.js must remain open. If it returns to a shell prompt, the server has stopped.

---

## Product concept

The application presents an Optima-like automation workspace. The primary screen is an **Automations** editor where a user builds a rule visually on a canvas.

The default example is an onboarding rule:

```
User signs up via landing page
            |
            v
       User selects
       /           \
   Founder       Designer
                     |
                     v
            Send reminder email
```

The user can:

- Move, pan, and zoom around a workflow canvas.

- Select trigger, condition, path, and action steps.

- Add steps using `+` controls.

- Add role-based paths under a condition.

- Add actions to steps.

- Drag supported applications from the properties panel onto the canvas.

- Drag applications onto an action drop zone inside the selected step.

- Edit conditions, path roles, audiences, notes, and settings.

- Rename the automation.

- Delete steps when graph-integrity rules permit it.

- Undo and redo changes.

- Use keyboard shortcuts and keyboard-accessible controls.

The visual design is intentionally polished and product-like, but most of the surrounding product shell remains a prototype.

---

## Current product scope

### Implemented or substantially implemented

- Single Automations screen.

- Sidebar shell with menu, projects, settings, and account presentation.

- Top bar with breadcrumbs, collaborators presentation, invite button presentation, notifications presentation, share button, and Save Rule button.

- Canvas with radial grid background.

- Flow step cards.

- Directed connectors between steps.

- Add-step buttons at flow ends.

- Canvas panning.

- Canvas zooming.

- Dragging steps.

- Dragging supported apps from the panel.

- Drop previews for application-created steps.

- Properties panel with Properties and Settings tabs.

- Condition editing.

- Role/path editing.

- Audience editing.

- Action list editing.

- Step settings and notes.

- Undo/redo.

- Refused-deletion feedback.

- Focus management and keyboard operation.

- Reduced-motion handling.

### Explicitly still prototype/placeholders

The README identifies these as placeholders:

- Other navigation items.

- Ask AI.

- Invite.

- Notifications.

- New project.

- Account menu.

- Per-step `...` overflow menus.

- Learn more links.

Additional product-level gaps inferred from the code:

- Save only updates in-memory UI state; it does not persist.

- Share has no actual sharing behavior.

- Collaborator avatars are static presentation.

- App cards are action templates, not real integrations.

- No rule execution or testing mode exists.

- No API route, server action, database, authentication, credentials, webhook, queue, or worker exists.

- Changes reset on page reload.

---

## Technology stack

### Runtime and framework

- Next.js `16.4.6`

- React `19.3.0`

- React DOM `19.3.0`

- TypeScript

- Node.js `20.9` or later is expected by the README

### UI and styling

- Tailwind CSS `4.3.3`

- `@tailwindcss/turbopack` `4.3.3`

- Custom theme tokens in `app/globals.css`

- Figtree loaded through `next/font/google`

- Phosphor Icons via `@phosphor-icons/react`

- A small set of custom SVG/glyph components

### Animation

- Motion `14.14.0`

- The code imports from `motion/react`.

- Reduced motion is enabled through `MotionConfig reducedMotion="user"` and `useReducedMotion` in the canvas view hook.

### Tooling

- ESLint 9

- `eslint-config-next` `16.4.6`

- Prettier `3.10.1` range

- `prettier-plugin-tailwindcss`

- npm lockfile is committed.

---

## Running the repository

From the repository root:

```bash
npm ci
npm run dev
```

For WSL/Windows networking, use:

```bash
npm run dev -- --hostname 0.0.0.0
```

Open:

```
http://localhost:3000
```

If localhost resolution behaves unexpectedly, use:

```
http://127.0.0.1:3000
```

Available scripts:

```
npm run dev          Start the development server
npm run build        Build for production
npm run start        Serve the production build
npm run lint         Run ESLint
npm run format       Format the repository with Prettier
npm run format:check Check formatting without changing files
```

Do not use `npm audit fix --force` while diagnosing or extending this project without first checking the resulting package changes. It can alter dependency versions beyond the intended project ranges.

---

## Validation status

A clean temporary clone was installed and checked successfully:

```bash
npm ci --silent
npm run lint
npm run build
```

Results:

- ESLint passed.

- TypeScript checking passed during the production build.

- Next.js production compilation passed.

- Static page generation passed.

- The generated routes were `/` and `/_not-found`.

The project therefore has a healthy baseline build.

---

## Repository tree

```
.gitignore
.prettierignore
.prettierrc.json
AGENTS.md
LICENSE
README.md

app/
├── favicon.ico
├── globals.css
├── layout.tsx
└── page.tsx

components/
├── automation-builder.tsx
├── builder/
│   ├── app-drag-chip.tsx
│   ├── canvas/
│   │   ├── add-step-button.tsx
│   │   ├── canvas-toolbar.tsx
│   │   ├── connectors.tsx
│   │   ├── drop-ghost.tsx
│   │   ├── flow-canvas.tsx
│   │   ├── name-pill.tsx
│   │   ├── step-card.tsx
│   │   └── use-canvas-view.ts
│   ├── error-toast.tsx
│   ├── focus.ts
│   ├── panel/
│   │   ├── actions-section.tsx
│   │   ├── condition-fields.tsx
│   │   ├── fields.tsx
│   │   ├── link-apps.tsx
│   │   ├── paths-list.tsx
│   │   ├── properties-panel.tsx
│   │   ├── properties-tab.tsx
│   │   ├── role-field.tsx
│   │   ├── settings-tab.tsx
│   │   ├── types.ts
│   │   └── use-reorderable.ts
│   ├── step-parts.tsx
│   ├── use-app-drag.ts
│   └── use-rule-editor.ts
├── icons/
│   ├── glyphs.tsx
│   └── index.tsx
├── shell/
│   ├── sidebar.tsx
│   └── top-bar.tsx
└── ui/
    └── dropdown.tsx

docs/
└── preview.jpg

lib/
├── cn.ts
├── flow/
│   ├── apps.ts
│   ├── catalog.ts
│   ├── derive.ts
│   ├── edits.ts
│   ├── geometry.ts
│   ├── index.ts
│   ├── initial-doc.ts
│   └── types.ts
├── motion.ts
└── use-history.ts

eslint.config.mjs
next.config.ts
package-lock.json
package.json
tsconfig.json
```

There are 58 tracked files including the binary favicon and preview image. The repository has no test suite and no API/server directory.

---

## Entry points and composition

### `app/page.tsx`

The page is intentionally minimal:

```tsx
import { AutomationBuilder } from "@/components/automation-builder";

export default function Home() {
  return <AutomationBuilder />;
}
```

### `app/layout.tsx`

The root layout:

- Loads Figtree through `next/font/google`.

- Imports global CSS.

- Sets page metadata:
  - Title: `Onboarding Process · Optima`
  - Description: `Build and edit automation rules.`

- Sets English document language.

- Makes the body full-height and hides overflow.

### `components/automation-builder.tsx`

This is the top-level client component and orchestration layer. It creates:

- `editor = useRuleEditor()`

- `canvasApi` ref for converting client coordinates to canvas/world coordinates.

- `appDrag = useAppDrag(...)` for panel-to-canvas application dragging.

It renders:

1. `MotionConfig reducedMotion="user"`

1. The `Sidebar`

1. The central column containing `TopBar` and `main`

1. `FlowCanvas`

1. Conditionally rendered `PropertiesPanel`

1. `ErrorToast`

1. `AppDragChip`

Important wiring:

- Dropping an app onto the canvas calls `editor.addStepAfter(parentId, { app, at })`.

- Dropping an app onto the selected step calls `editor.addActionToSelected(appAction(app))`.

- Deleting a step calls the editor and returns focus to the parent when successful.

- Selecting a step opens its panel.

- The panel inset is `PANEL_INSET` when a step is selected, otherwise zero.

---

## Domain model in `lib/flow`

The `lib/flow` package is deliberately plain TypeScript data and pure functions. It has no React dependency. This is the core extension point for a real workflow backend or persistence layer.

### `lib/flow/types.ts`

Important types:

```
type RoleKey = "founder" | "designer" | "developer" | "marketer" | "product" | "else";
type StepKind = "trigger" | "condition" | "path" | "action";
type ChipIcon = "play" | "doThis" | RoleKey;
type ActionKind = "email" | "message" | "tag" | "wait" | "notify" | "app";
```

`StepAction`:

```
type StepAction = {
  id: string;
  kind: ActionKind;
  label: string;
  detail: string;
  app?: AppKey;
};
```

`StepSettings`:

```
type StepSettings = {
  oncePerPerson: boolean;
  pauseOnError: boolean;
  notes: string;
};
```

`Step` contains:

- `id`

- `kind`

- `label`

- `x`, `y`

- `chip`

- Optional `app`

- `title` as an array of plain strings or tagged segments

- Optional `tags`

- `panel` metadata

- Optional `actions`

- Optional `match` for paths

- Optional `audience`

- Optional `settings`

`Doc` contains:

```
type Doc = {
  name: string;
  steps: Step[];
  links: Link[];
  conditionType: string;
  conditions: ConditionRow[];
  nextId: number;
};
```

The graph is represented by `steps` plus directed `links`:

```
type Link = { from: string; to: string };
```

Other model types include:

- `ConditionRow`

- `ActionTemplate`

- `PathInfo`

- `Bounds`

- `FlowLayout`

- `Edge`

- `AddButton`

### `lib/flow/initial-doc.ts`

Defines the initial onboarding example:

- Name: `Onboarding Process`

- Trigger ID: `trigger`

- Condition ID: `condition`

- Path IDs: `path-1`, `path-2`

- Action ID: `reminder`

- Next generated ID starts at `3`.

The trigger is:

```
User Sign up via landing page
```

The first condition row is:

```
subject: User selects
attributes: Roles
```

The default paths are Founder and Designer. The reminder action is connected to the Designer path.

### `lib/flow/apps.ts`

Defines application metadata and application keys:

```
type AppKey = "slack" | "asana" | "mailchimp" | "zapier" | "spotify";
```

Each app has:

- `key`

- `name`

- `description`

- `icon`

- `action`

- `stepDescription`

Apps:

| Key         | Name      | Created action            |
| ----------- | --------- | ------------------------- |
| `slack`     | Slack     | Send Slack message        |
| `asana`     | Asana     | Create Asana task         |
| `mailchimp` | Mailchimp | Add to Mailchimp audience |
| `zapier`    | Zapier    | Trigger a Zap             |
| `spotify`   | Spotify   | Share welcome playlist    |

Icons use the public Dashboard Icons CDN:

```
https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg
```

This is currently a visual dependency, not an integration dependency.

### `lib/flow/catalog.ts`

Defines:

- Role labels, titles, tags, and descriptions.

- Role order.

- Audience roles.

- Default settings.

- Condition types.

- Condition subjects.

- Condition attributes.

- Built-in action templates.

- `appAction(app)` conversion from app metadata to action template.

Role keys and behavior:

| Role        | Meaning         | Example path content    |
| ----------- | --------------- | ----------------------- |
| `founder`   | Founder         | Show business dashboard |
| `designer`  | Designer        | Show design workspace   |
| `developer` | Developer       | Show API quickstart     |
| `marketer`  | Marketer        | Show campaign planner   |
| `product`   | Product manager | Show roadmap board      |
| `else`      | Anyone else     | Show getting started    |

Default settings:

```
oncePerPerson: true
pauseOnError: false
notes: ""
```

Condition options:

```
New step
Wait for event
Time delay
```

Condition subject options:

```
User selects
User property
Event occurred
```

Condition attribute options:

```
Roles
Plan
Team size
Country
```

Built-in actions:

- Send email — Welcome series, day 1

- Show in-app message — Banner on next visit

- Add tag — onboarding-started

- Wait — 1 day

- Notify team — Growth team

### `lib/flow/derive.ts`

Contains derived presentation logic.

`deriveSteps(doc)`:

- Builds a condition title from the first condition row.

- Converts condition attributes into tagged title segments.

- Recomputes path labels such as `If: User selects`, `Else If: User selects`, and `Else`.

- Recomputes path chips, titles, tags, and panel metadata from the selected role.

`pathsOf(steps)` returns panel-friendly path information:

```
{id, role, prefix}
```

The key design principle is that semantic state is stored in the document while display copy is derived.

### `lib/flow/edits.ts`

Contains immutable document edit functions. Every edit returns a new `Doc` or returns the same document if no change is needed.

Functions include:

- `nextStepId(doc)`

- `nextPathId(doc)`

- `createPath(id, match, at)`

- `addStep(doc, parentId, options)`

- `unusedRole(doc)`

- `addPath(doc, conditionId)`

- `addAction(doc, stepId, template)`

- `setActions(doc, stepId, actions)`

- `setAudience(doc, stepId, audience)`

- `setPathRole(doc, stepId, match)`

- `updateSettings(doc, stepId, patch)`

- `addConditionRow(doc)`

- `moveStep(doc, id, x, y)`

- `removalProblem(doc, id)`

- `removeStep(doc, id)`

Deletion safety rules:

- The trigger cannot be deleted.

- A condition with child paths cannot be deleted.

- A path with child steps cannot be deleted.

- Other nodes can be removed.

- `removeStep` bridges parent links to child links after the node is removed.

Generated IDs are based on `doc.nextId`, so persistence and concurrent editing work will eventually need a stronger ID strategy.

### `lib/flow/geometry.ts`

Canvas constants:

```
STEP_WIDTH = 262
STEP_HEIGHT = 120
ADD_BUTTON_SIZE = 46
FRAME_WIDTH = 806
FRAME_OFFSET_X = 233
```

The geometry module:

- Routes connector SVG paths.

- Calculates layout edges.

- Adds continuation buttons to terminal steps.

- Calculates canvas bounds.

- Finds a free placement under a parent.

- Finds the nearest valid parent for a dropped app.

`layoutFlow(steps, links)` returns:

```
{
  edges,
  addButtons,
  bounds
}
```

Connector routing uses vertical lines when possible, rounded elbow-like paths when there is room, and an S-curve fallback for close or awkward placements.

`placeBelow` uses a row gap of `228` and column gap of `285`, moving right past overlapping nodes.

`nearestParent` ignores condition nodes because conditions only accept paths in the current interaction model.

### `lib/flow/index.ts`

Re-exports all flow modules, including the model types. Use this barrel import when adding new code:

```
import { ... } from "@/lib/flow";
```

---

## Editor state and history

### `lib/use-history.ts`

Generic React hook for immutable undo/redo.

State shape:

```
{
  past: T[];
  present: T;
  future: T[];
  mergeKey: string | null;
}
```

Behavior:

- Maximum history length is 100.

- If an updater returns the same object, no history entry is added.

- Updates sharing the same merge key replace the current present value instead of adding multiple past entries.

- Any new edit clears the redo future.

- Undo and redo clear the merge key.

### `components/builder/use-rule-editor.ts`

This is the application-level command layer over `useHistory<Doc>`.

It tracks:

- Current document.

- Saved document reference.

- Selected step ID.

- Refused deletion state.

- A refusal nonce for repeat shake animations.

It derives:

- `steps` via `deriveSteps(doc)`.

- `paths` via `pathsOf(steps)`.

- `pathRoles` from paths.

- `selected` from `selectedId`.

- Draft/Saved status by comparing `savedDoc === doc`.

Editor commands:

- `addStepAfter(parentId, options)`

- `addPathTo(conditionId)`

- `continueFrom(parentId)`

- `deleteStep(id)`

- `moveStep(id, x, y)`

- `nudgeStep(id, dx, dy)`

- `rename(name)`

- `setConditions(conditions)`

- `setConditionType(conditionType)`

- `addConditionRow()`

- `changeSettings(id, patch)`

- `changePathRole(id, role)`

- `changeAudience(id, roles)`

- `addActionToSelected(template)`

- `setSelectedActions(actions)`

- `save()`

- `undo()`

- `redo()`

- `select(id)`

- `dismissRefusal()`

Special behavior:

- Adding an action uses the current selection.

- Notes updates use a merge key such as `notes:<stepId>`.

- Keyboard nudges use a merge key such as `nudge:<stepId>`.

- A refused deletion displays a message for five seconds.

- Deleting the selected step clears selection and moves focus to the parent when possible.

- The trigger is selected initially.

---

## Canvas implementation

### `components/builder/canvas/flow-canvas.tsx`

The main canvas component handles:

- Rendering the surface.

- Rendering step cards.

- Rendering connectors.

- Rendering add buttons.

- Managing select/hand tools.

- Managing pan state.

- Managing dragged card position.

- Keyboard shortcuts.

- Pointer interactions.

- Reveal behavior for newly added steps.

- Connecting the canvas to external app drag behavior through `CanvasApi`.

Canvas API:

```
type CanvasApi = {
  clientToWorld(clientX: number, clientY: number): {x: number; y: number};
};
```

Canvas props include the document-derived steps and links, selection callbacks, movement callbacks, deletion callbacks, undo/redo callbacks, role callbacks, name callbacks, panel inset, drop preview, shake state, and API ref.

Keyboard behavior:

- `V`: select tool.

- `H`: hand/pan tool.

- Hold Space: temporary pan mode.

- Arrow keys: nudge selected/focused step by 12 pixels.

- Shift + Arrow: nudge by 48 pixels.

- Delete or Backspace: delete selected/focused step.

- Ctrl/Cmd + Z: undo.

- Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: redo.

- Ctrl/Cmd + wheel: zoom around the pointer.

- Plain wheel: pan.

The keyboard handler ignores typing targets such as inputs, textareas, selects, and contenteditable elements.

### `components/builder/canvas/use-canvas-view.ts`

Manages view transform:

```
type View = {x: number; y: number; scale: number};
```

Key values:

- Base zoom is 72 percent.

- Minimum scale corresponds to 25 percent.

- Maximum scale corresponds to 200 percent.

- Zoom step is `1.2`.

- Glide animation duration is `0.26` seconds.

- Toolbar clearance is 92 pixels.

It provides:

- `view`

- `ready`

- `zoom`

- `stopGlide`

- `takeControl`

- `panTo`

- `zoomIn`

- `zoomOut`

- `zoomTo`

- `fit`

- `reveal`

- `clientToWorld`

The first resize frames the initial flow. Once the user pans, zooms, drags, or otherwise takes control, automatic framing stops.

### `components/builder/canvas/step-card.tsx`

Renders individual workflow nodes. It is responsible for:

- Visual step card layout.

- Step icon/chip.

- Step title segments, including tag segments.

- Step footer tags.

- Selection state.

- Pointer interaction.

- Focusable keyboard interaction.

- Drop-zone handling for adding an app action.

- Node drag behavior.

The card is identified for keyboard lookup through a `data-step-id` attribute.

### `components/builder/canvas/connectors.tsx`

Renders SVG connectors from the geometry-generated edge paths. It receives layout edge data and applies styling/animation.

### `components/builder/canvas/add-step-button.tsx`

Renders the circular plus continuation button for terminal steps. It calls the appropriate callback; under a condition, the editor interprets continuation as adding a path rather than a regular action step.

### `components/builder/canvas/canvas-toolbar.tsx`

Renders:

- Select button.

- Hand button.

- Ask AI button presentation.

- Undo.

- Redo.

- Zoom menu/control.

The Ask AI button is currently a placeholder.

### `components/builder/canvas/name-pill.tsx`

Displays the automation name on the canvas and supports the rename interaction. Rename updates only the in-memory document.

### `components/builder/canvas/drop-ghost.tsx`

Renders the visual ghost/preview of an app step while an application is dragged over the canvas.

---

## Application drag behavior

### `components/builder/use-app-drag.ts`

Uses pointer events rather than native HTML drag-and-drop so it can work correctly with the zoomed canvas.

The drag object contains:

```
{
  app,
  clientX,
  clientY,
  preview,
  overStep
}
```

Behavior:

- A drag starts only on primary pointer input.

- Movement must exceed five pixels before the drag becomes active.

- The body gets the `is-grabbing` class while active.

- Escape cancels the drag.

- The pointer is converted to world/canvas coordinates through `CanvasApi`.

- Dropping over `[data-action-dropzone]` adds the app as an action to the selected step.

- Dropping over `[data-canvas-surface]` previews and creates a new action step.

- Dropping elsewhere cancels.

- The click event following a completed drag is ignored so a drag does not also activate a click handler.

### `components/builder/app-drag-chip.tsx`

Displays the floating app chip near the pointer while dragging.

---

## Properties panel

The panel is implemented in `components/builder/panel/` and is split into feature-specific pieces.

### `properties-panel.tsx`

The outer panel shell. It:

- Opens when a step is selected.

- Animates into view using Motion.

- Provides Properties and Settings tabs.

- Provides close and delete controls.

- Receives the selected derived step and editor callbacks.

- Uses a fixed panel inset so canvas framing accounts for the panel width.

The exported `PANEL_INSET` is used by the top-level builder and canvas view.

### `properties-tab.tsx`

Controls which property sections are rendered based on step type. It coordinates:

- Step description.

- Conditions.

- Paths.

- Actions.

- Linked applications.

- Audience selection.

### `settings-tab.tsx`

Edits:

- Once per person behavior.

- Pause on error behavior.

- Notes/context textarea.

Notes are merged in undo history per step.

### `condition-fields.tsx`

Edits condition rows, subjects, and attributes. The first row contributes the visible condition title; additional rows are part of the editable condition state.

### `paths-list.tsx`

Displays condition paths and enables path selection, path role changes, and adding a new path when an unused role exists.

### `role-field.tsx`

Renders role selection controls and role-specific choices.

### `actions-section.tsx`

Displays and manages ordered actions associated with the selected step. Supports adding built-in actions and reordering/removing actions through the relevant callbacks.

### `link-apps.tsx`

Displays searchable linked application cards. It supports pointer-based dragging and click-to-add behavior. App definitions come from `lib/flow/apps.ts`.

### `fields.tsx`

Shared field and form UI helpers used by panel sections.

### `use-reorderable.ts`

Client hook for local reorder state used by action lists. It synchronizes with incoming items and provides drag/reorder behavior.

### `types.ts`

Panel-specific prop and helper types.

---

## Shell and UI

### `components/shell/sidebar.tsx`

Renders the left navigation shell.

Presentation includes:

- Optima logo/glyph.

- Collapse button.

- Search input.

- Main navigation items:
  - Overview
  - Email
  - Automations
  - Analytics
  - Integrations
  - Workflow
  - Chatbots
  - Templates

- Projects:
  - Lead Sync Automation
  - Marketing
  - Landingpage Project

- Other items:
  - Settings
  - Get Help

- Static account card for Eleanor Pena / Free account.

The active item is Automations. Other navigation actions are placeholders.

### `components/shell/top-bar.tsx`

Renders:

- Breadcrumbs: Automations / Rules / workflow name.

- Draft or Saved status.

- Static collaborator avatars.

- Invite button presentation.

- Notification button presentation.

- Share button presentation.

- Save Rule button.

Save changes the in-memory status through `useRuleEditor.save`, but there is no persistence.

### `components/ui/dropdown.tsx`

Reusable accessible dropdown implementation with:

- Open/close state.

- Keyboard handling.

- Focus handling.

- Menu positioning.

- Menu item interactions.

Used by condition, role, audience, zoom, and other controls.

### `components/icons/index.tsx`

Central icon exports and icon wrappers. Uses Phosphor icons plus local glyphs.

### `components/icons/glyphs.tsx`

Contains original project glyphs for items such as the logo and workflow-specific visual marks.

### `components/builder/step-parts.tsx`

Shared visual pieces for step cards and panel content, including chips, titles, tags, and role/application badges.

### `components/builder/error-toast.tsx`

Displays refused edit/deletion messages. It is linked to the current refused state and the selected panel inset.

### `components/builder/focus.ts`

Small focus-management helper used to return keyboard focus to workflow nodes after deletion or panel close.

---

## Styling system

### `app/globals.css`

Uses Tailwind v4 CSS imports and a custom `@theme` block.

Important design tokens:

- Ink: `#0c0a09`

- Ink soft: `#4b4b49`

- Muted: `#6b6b68`

- Subtle: `#9c9c98`

- Line: `#e8e8e5`

- Canvas: `#f8f8f7`

- Brand: `#1e5b70`

- Logo: `#105069`

- Cyan, violet, amber, alert, success accents.

- Card, float, and lift shadows.

- Custom easing curves.

Global behavior:

- Light color scheme only.

- Full-height HTML/body.

- Body uses Figtree.

- Visible keyboard focus ring uses a brand color mix.

- Non-disabled buttons use pointer cursor.

- `scrollbar-subtle` utility styles quiet panel scrollbars.

- `is-grabbing` forces grabbing cursor and disables text selection.

- `no-transitions` temporarily disables transitions while components settle after hydration.

---

## Motion and animation

### `lib/motion.ts`

Contains shared Motion easing constants used by canvas and panel animations.

The project intentionally respects reduced-motion preferences:

- Top-level `MotionConfig` uses `reducedMotion="user"`.

- Canvas view uses `useReducedMotion()`.

- Animation functions immediately set final state when reduced motion is enabled.

- CSS includes `motion-reduce` variants for relevant transitions.

Animated areas include:

- Panel open/close.

- Step cards.

- Connectors.

- Menus.

- Toolbar transitions.

- Newly added node reveal.

- Error/refusal shake.

---

## Important interaction rules

### Adding a step

- A terminal step displays a `+` continuation button.

- Adding after a normal trigger, path, or action creates an action step.

- Clicking `+` under a condition adds a new path instead.

- New action steps are placed below the parent using geometry heuristics.

- Generated IDs use `step-${doc.nextId}`.

### Adding a path

- A condition can add paths only for roles not already represented.

- Roles are consumed in this order:
  - Founder
  - Designer
  - Developer
  - Marketer
  - Product manager
  - Anyone else

- A path uses the role catalog for its label, icon, title, tags, and description.

### Dropping an app

- Drop on canvas: creates a new action step preset to the app.

- Drop on selected step action zone: adds a linked app action to that step.

- Click an app card without dragging: adds it to the selected step.

### Deleting

- Trigger cannot be deleted.

- Condition with paths cannot be deleted.

- Path with children cannot be deleted.

- Safe deletion reconnects parents and children.

- Refused deletions show a reason and shake the relevant card.

### Save status

- Initial status: Draft.

- `save()` stores the current `Doc` object reference in component state.

- Status becomes Saved only while the saved object reference equals the current object reference.

- Any subsequent immutable edit creates a new object and returns status to Draft.

- Reload loses all changes.

---

## Accessibility behavior

The project deliberately supports keyboard access:

- Controls use buttons and semantic roles.

- Canvas nodes are discoverable by `data-step-id` and focus handling.

- Dropdown menus implement keyboard behavior.

- `aria-label`, `aria-current`, `aria-selected`, `aria-controls`, and `aria-live` are used in the shell and panel.

- The canvas surface has an accessible label.

- Inputs are excluded from global canvas keyboard shortcuts.

- Reduced motion is supported.

When extending the UI, preserve these patterns rather than adding mouse-only interactions.

---

## Configuration and conventions

### `next.config.ts`

Enables:

```
cacheComponents: true
partialPrefetching: true
```

Configures Turbopack CSS handling through `@tailwindcss/turbopack`.

### `tsconfig.json`

Important settings:

- Strict TypeScript.

- No emitted JS.

- Bundler module resolution.

- JSX transform `react-jsx`.

- `@/*` alias maps to repository root.

- Includes app, components, lib, Next generated type directories, and `.mts` files.

### `AGENTS.md`

Contains a generated Next.js agent rule telling coding agents that this project uses a newer/breaking Next.js version and that relevant local Next documentation should be checked before making framework changes.

### `.prettierrc.json`, `.prettierignore`, `.gitignore`

These maintain formatting and generated/dependency exclusions. Preserve existing formatting conventions and run `npm run format:check` before handoff.

### `LICENSE`

MIT license.

### `docs/preview.jpg`

A 507 KB visual preview of the Automations screen. It is documentation/reference imagery, not runtime application logic.

### `app/favicon.ico`

Project favicon binary.

### `package-lock.json`

Committed npm dependency lockfile. Prefer `npm ci` for reproducible setup.

---

## File-by-file inventory

The following inventory is intended to ensure no tracked project area is overlooked.

| File                                            | Role                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `.gitignore`                                    | Ignore rules for generated files and dependencies                                      |
| `.prettierignore`                               | Prettier exclusions                                                                    |
| `.prettierrc.json`                              | Formatting configuration                                                               |
| `AGENTS.md`                                     | Next.js-specific agent guidance                                                        |
| `LICENSE`                                       | MIT license                                                                            |
| `README.md`                                     | Product overview, setup, shortcuts, status, and project structure                      |
| `app/favicon.ico`                               | Favicon                                                                                |
| `app/globals.css`                               | Tailwind import, theme tokens, base styles, custom scrollbar and interaction utilities |
| `app/layout.tsx`                                | Root document layout, Figtree font, metadata                                           |
| `app/page.tsx`                                  | Root page rendering `AutomationBuilder`                                                |
| `components/automation-builder.tsx`             | Main application composition and callback wiring                                       |
| `components/builder/app-drag-chip.tsx`          | Floating visual for app drag                                                           |
| `components/builder/canvas/add-step-button.tsx` | Terminal-step continuation button                                                      |
| `components/builder/canvas/canvas-toolbar.tsx`  | Select/hand/Ask AI/undo/redo/zoom controls                                             |
| `components/builder/canvas/connectors.tsx`      | SVG edge rendering                                                                     |
| `components/builder/canvas/drop-ghost.tsx`      | Dragged application drop preview                                                       |
| `components/builder/canvas/flow-canvas.tsx`     | Main interactive workflow canvas                                                       |
| `components/builder/canvas/name-pill.tsx`       | Canvas automation title/rename UI                                                      |
| `components/builder/canvas/step-card.tsx`       | Workflow node card rendering and interaction                                           |
| `components/builder/canvas/use-canvas-view.ts`  | Pan, zoom, framing, reveal, world coordinates                                          |
| `components/builder/error-toast.tsx`            | Refused edit/deletion feedback                                                         |
| `components/builder/focus.ts`                   | Keyboard focus helpers                                                                 |
| `components/builder/panel/actions-section.tsx`  | Ordered action list UI                                                                 |
| `components/builder/panel/condition-fields.tsx` | Condition row UI                                                                       |
| `components/builder/panel/fields.tsx`           | Shared panel field helpers                                                             |
| `components/builder/panel/link-apps.tsx`        | Searchable app list and app drag/click actions                                         |
| `components/builder/panel/paths-list.tsx`       | Path list and path management UI                                                       |
| `components/builder/panel/properties-panel.tsx` | Animated panel shell and tabs                                                          |
| `components/builder/panel/properties-tab.tsx`   | Property-section composition                                                           |
| `components/builder/panel/role-field.tsx`       | Role selection UI                                                                      |
| `components/builder/panel/settings-tab.tsx`     | Settings and notes UI                                                                  |
| `components/builder/panel/types.ts`             | Panel-local types                                                                      |
| `components/builder/panel/use-reorderable.ts`   | Reorderable list hook                                                                  |
| `components/builder/step-parts.tsx`             | Shared step visual fragments                                                           |
| `components/builder/use-app-drag.ts`            | Pointer-based app dragging and drop target detection                                   |
| `components/builder/use-rule-editor.ts`         | Document command/state layer                                                           |
| `components/icons/glyphs.tsx`                   | Original project glyphs                                                                |
| `components/icons/index.tsx`                    | Icon exports/wrappers                                                                  |
| `components/shell/sidebar.tsx`                  | Left navigation and project shell                                                      |
| `components/shell/top-bar.tsx`                  | Breadcrumbs, status, share, save, collaborators shell                                  |
| `components/ui/dropdown.tsx`                    | Reusable accessible dropdown                                                           |
| `docs/preview.jpg`                              | Product preview image                                                                  |
| `eslint.config.mjs`                             | ESLint flat config for Next core web vitals and TypeScript                             |
| `lib/cn.ts`                                     | Class-name merge helper                                                                |
| `lib/flow/apps.ts`                              | App catalog and app metadata                                                           |
| `lib/flow/catalog.ts`                           | Roles, conditions, settings, action templates                                          |
| `lib/flow/derive.ts`                            | Derived display data for conditions and paths                                          |
| `lib/flow/edits.ts`                             | Immutable flow mutations and deletion safeguards                                       |
| `lib/flow/geometry.ts`                          | Canvas geometry, routing, placement, bounds                                            |
| `lib/flow/index.ts`                             | Flow barrel exports                                                                    |
| `lib/flow/initial-doc.ts`                       | Default onboarding workflow                                                            |
| `lib/flow/types.ts`                             | Core domain types                                                                      |
| `lib/motion.ts`                                 | Shared animation easing constants                                                      |
| `lib/use-history.ts`                            | Generic undo/redo hook                                                                 |
| `next.config.ts`                                | Next.js/Turbopack configuration                                                        |
| `package-lock.json`                             | Locked npm dependency graph                                                            |
| `package.json`                                  | Project metadata, scripts, dependencies                                                |
| `tsconfig.json`                                 | Strict TypeScript and path alias configuration                                         |

---

## Architectural strengths to preserve

1. **Pure flow model:** Keep business/domain operations in `lib/flow`, without React imports.

1. **Immutable edits:** Continue returning new documents from mutations so undo/redo and change detection remain predictable.

1. **Derived display state:** Keep display labels and copy derived from semantic data where possible.

1. **Central editor commands:** Route UI edits through `useRuleEditor` rather than mutating state in leaf components.

1. **Feature-oriented components:** Preserve the separation between canvas, panel, shell, icons, and shared UI.

1. **Graph safety:** Extend validation rather than allowing arbitrary graph corruption.

1. **Accessibility:** Preserve keyboard focus, semantic controls, aria metadata, and reduced-motion handling.

1. **Canvas coordinate separation:** Keep world/canvas coordinates distinct from client/pixel coordinates.

1. **Undo semantics:** Use merge keys for high-frequency edits such as notes and nudges.

1. **Current visual language:** Reuse theme tokens and existing component patterns rather than introducing an unrelated design system.

---

## Gaps to solve for a real product

A production build-out will need a deliberate transition from a local prototype to a persisted automation system.

### Persistence

Add a durable model for:

- Users.

- Workspaces/organizations.

- Projects.

- Automations/rules.

- Version history.

- Published versus draft versions.

- Step and link data.

- Action configuration.

- Notes and settings.

The current `Doc` is a reasonable draft document shape but should gain schema versioning and validation before being persisted.

### Backend/API

Add endpoints or server actions for:

- Load automation.

- Create automation.

- Save draft.

- Publish version.

- Rename.

- Add/update/delete/reorder nodes.

- Collaborator access.

- App connection management.

- Test/run automation.

- Execution history.

### Authentication and authorization

Add user/workspace identity and enforce ownership or role-based access on every automation operation.

### Real app integrations

Current app entries are templates only. A real integration layer needs:

- OAuth or API key connection flows.

- Encrypted credential storage.

- Provider clients.

- Action schemas.

- Input mapping.

- Provider error handling.

- Retry policies.

- Rate limiting.

- Connection health status.

### Workflow execution

Add an execution model with:

- Trigger evaluation.

- Condition evaluation.

- Path routing.

- Action execution.

- Per-step logs.

- Retries.

- Pause-on-error behavior.

- Idempotency.

- Once-per-person enforcement.

- Queues/workers for asynchronous work.

- Replay/test mode.

### Validation

The current deletion safeguards are only a first layer. Add validation for:

- Orphan nodes.

- Cycles if cycles are not supported.

- Missing action configuration.

- Invalid path role assignments.

- Missing condition rows.

- Invalid edges.

- Unreachable nodes.

- Multiple triggers if unsupported.

- Unsupported action combinations.

### Persistence and collaboration semantics

The current `nextId` counter is local and unsafe for concurrent editing. Replace or supplement it with globally unique IDs. If collaborative editing is planned, define conflict behavior before implementing optimistic updates.

---

## Suggested implementation sequence

A practical build-out path for another agent:

### Phase 1: Stabilize the prototype

- Add unit tests for `lib/flow` pure functions.

- Add tests for deletion safeguards, path role allocation, link bridging, geometry, and history merging.

- Add a schema validator for `Doc`.

- Replace stringly typed condition values with explicit unions where appropriate.

- Remove or document all placeholder controls.

- Add a small error boundary and client-side error reporting.

### Phase 2: Add local persistence

- Persist draft documents to localStorage or IndexedDB.

- Restore the document on load.

- Add migration/version metadata.

- Keep the current `useRuleEditor` API stable while changing its persistence implementation.

### Phase 3: Introduce backend persistence

- Create workspace/project/automation models.

- Add draft loading and saving.

- Replace the fake Save Rule action with a real mutation and pending/error states.

- Keep the pure `Doc` model serializable.

### Phase 4: Build integration infrastructure

- Add connected-app records.

- Add secure credentials or OAuth connection flows.

- Add action configuration schemas.

- Make the properties panel render action-specific fields.

### Phase 5: Build execution

- Add trigger/event ingestion.

- Add condition/path evaluation.

- Add queued action execution.

- Add execution logs and per-step status.

- Add pause/retry/idempotency behavior.

### Phase 6: Expand product shell

- Implement projects and navigation.

- Implement sharing and collaboration.

- Implement notifications.

- Implement account/settings.

- Implement Ask AI only after the document schema and safety constraints are established.

---

## Recommended handoff instructions to the next agent

The next agent should:

1. Clone or open `WambuaJoe/workflows`.

1. Read this handoff together with the repository README and `AGENTS.md`.

1. Run `npm ci` before making changes.

1. Run `npm run lint` and `npm run build` to establish a baseline.

1. Treat `lib/flow` as the domain source of truth.

1. Do not add backend behavior directly into presentation components.

1. Preserve immutable document edits and the existing undo/redo contract.

1. Add tests before substantially changing graph operations.

1. Decide explicitly whether the next milestone is local persistence, backend persistence, real integrations, or execution.

1. Avoid broad dependency upgrades unless required and validated.

1. Keep WSL development server instructions explicit:

```bash
cd ~/.ssh/projects/workflows
npm ci
npm run dev -- --hostname 0.0.0.0
```

1. Verify the listener before debugging the browser:

```bash
ss -ltnp | grep ':3000'
curl http://127.0.0.1:3000
```

---

## Final assessment

`WambuaJoe/workflows` is a clean, well-organized Next.js/React prototype for a visual automation-rule builder. Its strongest qualities are the separation of pure flow logic from React presentation, immutable edit functions, graph-aware deletion safeguards, a thoughtful canvas interaction model, and good keyboard/reduced-motion support.

The current repository should be extended as a product foundation, not rewritten from scratch. The next major architectural step is to introduce a validated, versioned, persisted automation document while keeping the current canvas and editor command contracts stable. After persistence, real integrations and an execution engine can be layered on top.
