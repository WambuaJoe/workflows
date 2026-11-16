"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  INITIAL_DOC, addAction, addConditionRow, addPath, addStep, deriveSteps,
  moveStep, nextPathId, nextStepId, pathsOf, removalProblem, removeStep,
  setActions, setAudience, setPathRole, unusedRole, updateSettings,
  type ActionTemplate, type AppKey, type ConditionRow, type Doc, type RoleKey,
  type StepAction, type StepSettings,
} from "@/lib/flow";
import { useHistory } from "@/lib/use-history";

const REFUSAL_TIMEOUT_MS = 5000;
type SaveStatus = "Loading" | "Draft" | "Saving" | "Saved" | "Error";

export type RefusedEdit = { stepId: string; nonce: number; title: string; message: string };
export type DeleteResult = { deleted: false } | { deleted: true; parentId: string | null };

/** The rule being edited: document, history, selection and every command the UI runs. */
export function useRuleEditor() {
  const history = useHistory<Doc>(INITIAL_DOC);
  const { present: doc, set } = history;
  const [savedDoc, setSavedDoc] = useState<Doc | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("Loading");
  const [selectedId, setSelectedId] = useState<string | null>("condition");
  const [refused, setRefused] = useState<RefusedEdit | null>(null);
  const refusalCount = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  const steps = useMemo(() => deriveSteps(doc), [doc]);
  const paths = useMemo(() => pathsOf(steps), [steps]);
  const pathRoles = useMemo(() => paths.map((p) => p.role), [paths]);
  const selected = steps.find((s) => s.id === selectedId) ?? null;

  const latest = useRef({ doc, steps, selectedId });
  useEffect(() => { latest.current = { doc, steps, selectedId }; });

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/workflows/demo", { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error?.message ?? "Unable to load the saved workflow.");
        }
        const definition = payload.data.workflow.definition as Doc;
        history.replace(definition);
        setSavedDoc(definition);
        setSaveStatus("Saved");
      } catch {
        if (!controller.signal.aborted) setSaveStatus("Error");
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    })();
    return () => controller.abort();
  }, [history.replace]);

  const persist = useCallback((snapshot: Doc, createVersion: boolean) => {
    const task = saveQueue.current.catch(() => undefined).then(async () => {
      setSaveStatus("Saving");
      const response = await fetch("/api/workflows/demo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definition: snapshot, createVersion }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        const details = payload.error?.details as { message?: string }[] | undefined;
        throw new Error(details?.[0]?.message ?? payload.error?.message ?? "The workflow could not be saved.");
      }
      if (latest.current.doc === snapshot) {
        setSavedDoc(snapshot);
        setSaveStatus("Saved");
      }
    });
    saveQueue.current = task;
    return task.catch((error: unknown) => {
      setSaveStatus("Error");
      throw error;
    });
  }, []);

  // Auto-save edits to the mutable draft. Manual Save additionally creates a version snapshot.
  useEffect(() => {
    if (!loaded || savedDoc === doc) return;
    const timer = window.setTimeout(() => { void persist(doc, false).catch(() => undefined); }, 700);
    return () => window.clearTimeout(timer);
  }, [doc, loaded, persist, savedDoc]);

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
    }, [set],
  );

  const addPathTo = useCallback((conditionId: string) => {
    if (!unusedRole(latest.current.doc)) return;
    const id = nextPathId(latest.current.doc);
    set((d) => addPath(d, conditionId));
    setSelectedId(id);
  }, [set]);

  const continueFrom = useCallback((parentId: string) => {
    const parent = latest.current.steps.find((s) => s.id === parentId);
    if (parent?.kind === "condition") addPathTo(parentId);
    else addStepAfter(parentId);
  }, [addPathTo, addStepAfter]);

  const deleteStep = useCallback((id: string): DeleteResult => {
    const { doc, steps } = latest.current;
    const problem = removalProblem(doc, id);
    if (problem) {
      const title = steps.find((s) => s.id === id)?.panel.title ?? "this step";
      refusalCount.current += 1;
      setRefused({ stepId: id, nonce: refusalCount.current, title: `Can't delete “${title}”`, message: problem });
      return { deleted: false };
    }
    setRefused(null);
    set((d) => removeStep(d, id));
    setSelectedId((current) => current === id ? null : current);
    return { deleted: true, parentId: doc.links.find((l) => l.to === id)?.from ?? null };
  }, [set]);

  const moveStepTo = useCallback((id: string, x: number, y: number) =>
    set((d) => moveStep(d, id, x, y)), [set]);

  const nudgeStep = useCallback((id: string, dx: number, dy: number) =>
    set((d) => {
      const step = d.steps.find((s) => s.id === id);
      return step ? moveStep(d, id, step.x + dx, step.y + dy) : d;
    }, `nudge:${id}`), [set]);

  const setConditionType = useCallback((conditionType: string) =>
    set((d) => d.conditionType === conditionType ? d : { ...d, conditionType }), [set]);
  const addRow = useCallback(() => set(addConditionRow), [set]);
  const changeSettings = useCallback((id: string, patch: Partial<StepSettings>) =>
    set((d) => updateSettings(d, id, patch), "notes" in patch ? `notes:${id}` : undefined), [set]);
  const rename = useCallback((name: string) =>
    set((d) => d.name === name ? d : { ...d, name }), [set]);
  const setConditions = useCallback((conditions: ConditionRow[]) =>
    set((d) => ({ ...d, conditions })), [set]);
  const changePathRole = useCallback((id: string, role: RoleKey) =>
    set((d) => setPathRole(d, id, role)), [set]);
  const changeAudience = useCallback((id: string, roles: RoleKey[]) =>
    set((d) => setAudience(d, id, roles)), [set]);
  const addActionToSelected = useCallback((template: ActionTemplate) => {
    const id = latest.current.selectedId;
    if (id) set((d) => addAction(d, id, template));
  }, [set]);
  const setSelectedActions = useCallback((actions: StepAction[]) => {
    const id = latest.current.selectedId;
    if (id) set((d) => setActions(d, id, actions));
  }, [set]);

  const save = useCallback(() => persist(latest.current.doc, true), [persist]);
  const dismissRefusal = useCallback(() => setRefused(null), []);
  const status: SaveStatus =
    saveStatus === "Error" || saveStatus === "Loading" || saveStatus === "Saving"
      ? saveStatus
      : savedDoc === doc ? "Saved" : "Draft";

  return {
    doc, steps, paths, pathRoles, selected, status,
    canAddPath: unusedRole(doc) !== null, refused,
    canUndo: history.canUndo, canRedo: history.canRedo,
    undo: history.undo, redo: history.redo, select: setSelectedId,
    addStepAfter, addPathTo, continueFrom, deleteStep,
    moveStep: moveStepTo, nudgeStep, rename, setConditions,
    setConditionType, addConditionRow: addRow, changeSettings,
    changePathRole, changeAudience, addActionToSelected, setSelectedActions,
    save, dismissRefusal,
  };
}
