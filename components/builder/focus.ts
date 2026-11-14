/** Focuses a step's card once React has committed, or the canvas when there's no card. */
export function focusStep(id: string | null) {
  requestAnimationFrame(() => {
    const card = id
      ? document.querySelector<HTMLElement>(`[data-step-id="${CSS.escape(id)}"] [role="group"]`)
      : null;
    const target = card ?? document.querySelector<HTMLElement>("[data-canvas-surface]");
    target?.focus({ preventScroll: true });
  });
}
