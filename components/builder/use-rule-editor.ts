"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  INITIAL_DOC,
  addAction,
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
  type ActionTemplate,
  type AppKey,
  type ConditionRow,
  type Doc,
  type RoleKey,
  type StepAction,
} from "@/lib/flow";
import { useHistory } from "@/lib/use-history";

const REFUSAL_TIMEOUT_MS = 5000;

/** An edit that was refused. The nonce lets a repeat replay the card's shake. */
export type RefusedEdit = { stepId: string; nonce: number; title: string; message: string };

/** The rule being edited: document, history, selection and every command the UI runs. */
export function useRuleEditor() {
  const history = useHistory<Doc>(INITIAL_DOC);
  const { present: doc, set } = history;
  const [savedDoc, setSavedDoc] = useState<Doc | null>(null);
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
    (id: string) => {
      const problem = removalProblem(latest.current.doc, id);
      if (problem) {
        const title = latest.current.steps.find((s) => s.id === id)?.panel.title ?? "this step";
        refusalCount.current += 1;
        setRefused({
          stepId: id,
          nonce: refusalCount.current,
          title: `Can't delete “${title}”`,
          message: problem,
        });
        return;
      }
      setRefused(null);
      set((d) => removeStep(d, id));
      setSelectedId((current) => (current === id ? null : current));
    },
    [set],
  );

  const moveStepTo = useCallback(
    (id: string, x: number, y: number) => set((d) => moveStep(d, id, x, y)),
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

  const save = useCallback(() => setSavedDoc(latest.current.doc), []);
  const dismissRefusal = useCallback(() => setRefused(null), []);

  return {
    doc,
    steps,
    paths,
    pathRoles,
    selected,
    status: savedDoc === doc ? ("Saved" as const) : ("Draft" as const),
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
    rename,
    setConditions,
    changePathRole,
    changeAudience,
    addActionToSelected,
    setSelectedActions,
    save,
    dismissRefusal,
  };
}
