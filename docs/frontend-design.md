# Frontend Design Boundary

## Ownership

Figma is the source of truth for future frontend design work. Keep frontend design and implementation decisions out of the overall backend architecture document.

## Existing interface baseline

The current Workflows demo page is the interface for the first end-to-end prototype. Preserve its existing visual design and editor interactions. Do not redesign or replace the canvas, properties panel, sidebar, or top bar as part of backend work.

## Backend integration boundary

The frontend should communicate with the Workflows backend through the agreed REST API. It must not call n8n directly or receive n8n API keys, database credentials, webhook secrets, or integration credentials.

The first integration should replace demo-only in-memory Save and Run behavior with real backend operations while keeping the existing screen and interaction model.

## Scope

- Preserve the existing demo page and visual language.
- Wire existing editor state to backend load/save operations.
- Add only the minimum controls or status feedback needed to expose real validation, test execution, and execution results.
- Defer frontend redesign, new navigation, visual refinements, and nonessential product-shell work to Figma and later iterations.
