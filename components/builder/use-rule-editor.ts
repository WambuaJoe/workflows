"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  INITIAL_DOC,
  addAction,
  addConditionRow,
  addPath,
  addStep,
  deriveSteps,
  moveStep,
  nextPathId,
  nextStepId,
  pathsOf,
  removalProblem,
  removeStep,
  setActions,
  setAudience,
  setPathRole,
  unusedRole,
  updateSettings,
  type ActionTemplate,
  type AppKey,
  type ConditionRow,
  type Doc,
  type RoleKey,
  type StepAction,
  type StepSettings,
} from "@/lib/flow";
import { useHistory } from "@/lib/use-history";

const REFUSAL_TIMEOUT_MS = 5000;

/** An edit that was refused. The nonce lets a repeat replay the card's shake. */
export type RefusedEdit = { stepId: string; nonce: number; title: string; message: string };

/** What deleting did, so the caller can move focus somewhere sensible. */
export type DeleteResult = { deleted: false } | { deleted: true; parentId: string | null };

/** The rule being edited: document, history, selection and every command the UI runs. */
export function useRuleEditor() {
  const history = useHistory<Doc>(INITIAL_DOC);
  const { present: doc, set, reset } = history;
  const [savedDoc, setSavedDoc] = useState<Doc | null>(null);
  const [persistenceState, setPersistenceState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const workflowId = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>("condition");
  const [refused, setRefused] = useState<RefusedEdit | null>(null);
  const refusalCount = useRef(0);

  const steps = useMemo(() => deriveSteps(doc), [doc]);
  const paths = useMemo(() => pathsOf(steps), [steps]);
  const pathRoles = useMemo(() => paths.map((p) => p.role), [paths]);
  // Undo can remove the selected step; the selection then resolves to nothing.
  const selected = steps.find((s) => s.id === selectedId) ?? null;

  const latest = useRef({ doc, steps, selectedId });
  useEffect(() => {
    latest.current = { doc, steps, selectedId };
  });

  // Load the user's current workflow, creating the initial example on first use.
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const storageKey = "workflows.currentWorkflowId";
        let remote: { id: string; doc: Doc } | null = null;
        const storedId = window.localStorage.getItem(storageKey);

        if (storedId) {
          const response = await fetch(`/api/workflows/${storedId}`, { cache: "no-store" });
          if (response.ok) {
            const payload = await response.json();
            remote = payload.data.workflow;
          } else if (response.status === 404) {
            window.localStorage.removeItem(storageKey);
          } else {
            throw new Error("Could not load the saved workflow.");
          }
        }

        if (!remote) {
          const response = await fetch("/api/workflows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doc: INITIAL_DOC }),
          });
          if (!response.ok) throw new Error("Could not create the first saved workflow.");
          const payload = await response.json();
          remote = payload.data.workflow;
          window.localStorage.setItem(storageKey, remote.id);
        }

        if (cancelled) return;
        workflowId.current = remote.id;
        reset(remote.doc);
        setSavedDoc(remote.doc);
        setPersistenceState("ready");
      } catch (error) {
        if (!cancelled) {
          console.error("Workflow hydration failed:", error);
          setPersistenceState("error");
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  useEffect(() => {
    if (!refused) return;
    const t = window.setTimeout(() => setRefused(null), REFUSAL_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [refused]);

  const addStepAfter = useCallback(
    (parentId: string | null, options: { app?: AppKey; at?: { x: number; y: number } } = {}) => {
      const id = nextStepId(latest.current.doc);
      set((d) => addStep(d, parentId, options));
      setSelectedId(id);
    },
    [set],
  );

  const addPathTo = useCallback(
    (conditionId: string) => {
      if (!unusedRole(latest.current.doc)) return;
      const id = nextPathId(latest.current.doc);
      set((d) => addPath(d, conditionId));
      setSelectedId(id);
    },
    [set],
  );

  /** The "+" under a condition adds a path; anywhere else it adds a step. */
  const continueFrom = useCallback(
    (parentId: string) => {
      const parent = latest.current.steps.find((s) => s.id === parentId);
      if (parent?.kind === "condition") addPathTo(parentId);
      else addStepAfter(parentId);
    },
    [addPathTo, addStepAfter],
  );

  /** Deletes a step, or refuses with a reason when that would break the flow. */
  const deleteStep = useCallback(
    (id: string): DeleteResult => {
      const { doc, steps } = latest.current;
      const problem = removalProblem(doc, id);
      if (problem) {
        const title = steps.find((s) => s.id === id)?.panel.title ?? "this step";
        refusalCount.current += 1;
        setRefused({
          stepId: id,
          nonce: refusalCount.current,
          title: `Can't delete “${title}”`,
          message: problem,
        });
        return { deleted: false };
      }
      setRefused(null);
      set((d) => removeStep(d, id));
      setSelectedId((current) => (current === id ? null : current));
      return { deleted: true, parentId: doc.links.find((l) => l.to === id)?.from ?? null };
    },
    [set],
  );

  const moveStepTo = useCallback(
    (id: string, x: number, y: number) => set((d) => moveStep(d, id, x, y)),
    [set],
  );

  const nudgeStep = useCallback(
    (id: string, dx: number, dy: number) =>
      set((d) => {
        const step = d.steps.find((s) => s.id === id);
        return step ? moveStep(d, id, step.x + dx, step.y + dy) : d;
      }, `nudge:${id}`),
    [set],
  );

  const setConditionType = useCallback(
    (conditionType: string) =>
      set((d) => (d.conditionType === conditionType ? d : { ...d, conditionType })),
    [set],
  );

  const addRow = useCallback(() => set(addConditionRow), [set]);

  /** Notes typing merges into one undo step per step; toggles each get their own. */
  const changeSettings = useCallback(
    (id: string, patch: Partial<StepSettings>) =>
      set((d) => updateSettings(d, id, patch), "notes" in patch ? `notes:${id}` : undefined),
    [set],
  );

  const rename = useCallback(
    (name: string) => set((d) => (d.name === name ? d : { ...d, name })),
    [set],
  );

  const setConditions = useCallback(
    (conditions: ConditionRow[]) => set((d) => ({ ...d, conditions })),
    [set],
  );

  const changePathRole = useCallback(
    (id: string, role: RoleKey) => set((d) => setPathRole(d, id, role)),
    [set],
  );

  const changeAudience = useCallback(
    (id: string, roles: RoleKey[]) => set((d) => setAudience(d, id, roles)),
    [set],
  );

  const addActionToSelected = useCallback(
    (template: ActionTemplate) => {
      const id = latest.current.selectedId;
      if (id) set((d) => addAction(d, id, template));
    },
    [set],
  );

  const setSelectedActions = useCallback(
    (actions: StepAction[]) => {
      const id = latest.current.selectedId;
      if (id) set((d) => setActions(d, id, actions));
    },
    [set],
  );

  const save = useCallback(async () => {
    const id = workflowId.current;
    if (!id || persistenceState === "loading" || persistenceState === "saving") return;

    const snapshot = latest.current.doc;
    setPersistenceState("saving");
    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: snapshot }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.error?.message ?? "Could not save the workflow.";
        throw new Error(message);
      }
      setSavedDoc(snapshot);
      setPersistenceState("ready");
    } catch (error) {
      console.error("Workflow save failed:", error);
      setPersistenceState("error");
    }
  }, [persistenceState]);
  const dismissRefusal = useCallback(() => setRefused(null), []);

  return {
    doc,
    steps,
    paths,
    pathRoles,
    selected,
    status:
      persistenceState === "loading"
        ? ("Loading" as const)
        : persistenceState === "saving"
          ? ("Saving" as const)
          : persistenceState === "error"
            ? ("Error" as const)
            : savedDoc === doc
              ? ("Saved" as const)
              : ("Draft" as const),
    canAddPath: unusedRole(doc) !== null,
    refused,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undo: history.undo,
    redo: history.redo,
    select: setSelectedId,
    addStepAfter,
    addPathTo,
    continueFrom,
    deleteStep,
    moveStep: moveStepTo,
    nudgeStep,
    rename,
    setConditions,
    setConditionType,
    addConditionRow: addRow,
    changeSettings,
    changePathRole,
    changeAudience,
    addActionToSelected,
    setSelectedActions,
    save,
    dismissRefusal,
  };
}
