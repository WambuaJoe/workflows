"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Execution = {
  id: string;
  mode: "test" | "production";
  status: string;
  input: unknown;
  output: unknown;
  error: unknown;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

type ExecutionStep = {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: string;
  input: unknown;
  output: unknown;
  error: unknown;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

type ExecutionDetail = { execution: Execution; steps: ExecutionStep[] };

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDuration(start: string | null, end: string | null) {
  if (!start) return "—";
  const milliseconds = Math.max(0, new Date(end ?? Date.now()).getTime() - new Date(start).getTime());
  if (!Number.isFinite(milliseconds)) return "—";
  if (milliseconds < 1000) return milliseconds + " ms";
  return (milliseconds / 1000).toFixed(2) + " s";
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "No data recorded";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function statusClass(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-success-soft text-success";
    case "failed":
      return "bg-[#fff0f0] text-alert";
    case "running":
      return "bg-cyan-soft text-sky";
    case "queued":
      return "bg-amber-soft text-[#986018]";
    case "cancelled":
      return "bg-tint text-muted";
    default:
      return "bg-tint text-muted";
  }
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={"inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium capitalize " + statusClass(status)}>
      {status}
    </span>
  );
}

function DataDisclosure({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="min-w-0 rounded-lg border border-line bg-white">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-ink-soft">
        {label}
      </summary>
      <pre className="scrollbar-subtle max-h-72 overflow-auto border-t border-line bg-canvas p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-ink-soft">
        {formatValue(value)}
      </pre>
    </details>
  );
}

export function ExecutionHistory({
  workflowId,
  open,
  onClose,
}: {
  workflowId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ExecutionDetail>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async (silent = false) => {
    if (!workflowId || inFlight.current) return;
    inFlight.current = true;
    const request = new AbortController();
    controller.current = request;
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch(
        "/api/workflows/" + workflowId + "/executions?all=true",
        { cache: "no-store", signal: request.signal },
      );
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Could not load execution history.");
      }
      setExecutions(payload.data.executions ?? []);
      setError(null);
      setLastUpdated(new Date());

      if (expandedExecution) {
        setDetailLoading((current) => ({ ...current, [expandedExecution]: true }));
        try {
          const detailResponse = await fetch("/api/executions/" + expandedExecution, {
            cache: "no-store",
            signal: request.signal,
          });
          const detailPayload = await detailResponse.json();
          if (!detailResponse.ok || !detailPayload?.ok) {
            throw new Error(detailPayload?.error?.message ?? "Could not refresh execution details.");
          }
          setDetails((current) => ({ ...current, [expandedExecution]: detailPayload.data }));
          setDetailErrors((current) => ({ ...current, [expandedExecution]: "" }));
        } catch (cause) {
          if (!request.signal.aborted) {
            setDetailErrors((current) => ({
              ...current,
              [expandedExecution]: cause instanceof Error ? cause.message : "Could not refresh execution details.",
            }));
          }
        } finally {
          setDetailLoading((current) => ({ ...current, [expandedExecution]: false }));
        }
      }
    } catch (cause) {
      if (!request.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Could not load execution history.");
      }
    } finally {
      if (controller.current === request) {
        controller.current = null;
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [workflowId, expandedExecution]);

  useEffect(() => {
    if (!open || !workflowId) return;
    void loadHistory();
    const interval = window.setInterval(() => void loadHistory(true), 15_000);
    return () => {
      window.clearInterval(interval);
      controller.current?.abort();
      controller.current = null;
      inFlight.current = false;
    };
  }, [open, workflowId, loadHistory]);

  const loadExecutionDetail = async (id: string) => {
    if (detailLoading[id]) return;
    setDetailLoading((current) => ({ ...current, [id]: true }));
    setDetailErrors((current) => ({ ...current, [id]: "" }));
    try {
      const response = await fetch("/api/executions/" + id, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Could not load execution details.");
      }
      setDetails((current) => ({ ...current, [id]: payload.data }));
    } catch (cause) {
      setDetailErrors((current) => ({
        ...current,
        [id]: cause instanceof Error ? cause.message : "Could not load execution details.",
      }));
    } finally {
      setDetailLoading((current) => ({ ...current, [id]: false }));
    }
  };

  const toggleExecution = (id: string) => {
    if (expandedExecution === id) {
      setExpandedExecution(null);
      return;
    }
    setExpandedExecution(id);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/30 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="execution-history-title"
        className="flex max-h-[min(86vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-float"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="execution-history-title" className="text-base font-semibold text-ink">
              Execution History
            </h2>
            <p className="mt-1 text-xs text-muted">
              Test and production runs for this workflow
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close execution history"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            ×
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3 sm:px-6">
            <p className="text-xs text-muted" aria-live="polite">
              {loading
                ? "Loading executions…"
                : executions.length + (executions.length === 1 ? " execution" : " executions")}
              {lastUpdated ? " · Updated " + lastUpdated.toLocaleTimeString() : ""}
            </p>
            <div className="flex items-center gap-2">
              {refreshing && <span className="text-[11px] text-muted">Refreshing…</span>}
              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={loading || refreshing}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-hover disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {error && (
              <div className="mb-4 rounded-xl border border-[#f5caca] bg-[#fff7f7] px-4 py-3 text-sm text-alert">
                {error}
              </div>
            )}

            {loading && executions.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted">Loading execution history…</div>
            ) : executions.length === 0 && !error ? (
              <div className="rounded-xl border border-dashed border-line-strong px-4 py-16 text-center">
                <p className="text-sm font-medium text-ink">No executions yet</p>
                <p className="mt-1 text-xs text-muted">Test or publish and run this workflow to see its history here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {executions.map((execution) => {
                  const expanded = expandedExecution === execution.id;
                  const detail = details[execution.id];
                  return (
                    <article key={execution.id} className="overflow-hidden rounded-xl border border-line bg-white">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => void toggleExecution(execution.id)}
                        className="grid w-full grid-cols-1 gap-3 px-4 py-4 text-left transition-colors hover:bg-hover sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-ink">
                            {formatDate(execution.startedAt ?? execution.createdAt)}
                          </span>
                          <StatusPill status={execution.status} />
                          <span className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                            {execution.mode}
                          </span>
                        </span>
                        <span className="flex items-center justify-between gap-4 text-xs text-muted sm:justify-end">
                          <span>{formatDuration(execution.startedAt, execution.completedAt)}</span>
                          <span aria-hidden className="text-base">{expanded ? "⌃" : "⌄"}</span>
                        </span>
                      </button>

                      {expanded && (
                        <div className="border-t border-line bg-canvas/60 px-4 py-4">
                          <div className="grid gap-3 text-xs sm:grid-cols-3">
                            <div>
                              <p className="text-muted">Started</p>
                              <p className="mt-1 font-medium text-ink-soft">{formatDate(execution.startedAt ?? execution.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-muted">Completed</p>
                              <p className="mt-1 font-medium text-ink-soft">{formatDate(execution.completedAt)}</p>
                            </div>
                            <div>
                              <p className="text-muted">Duration</p>
                              <p className="mt-1 font-medium text-ink-soft">{formatDuration(execution.startedAt, execution.completedAt)}</p>
                            </div>
                          </div>

                          {detailLoading[execution.id] ? (
                            <p className="mt-4 text-xs text-muted">Loading step details…</p>
                          ) : detailErrors[execution.id] ? (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-alert">
                              <span>{detailErrors[execution.id]}</span>
                              <button type="button" onClick={() => void loadExecutionDetail(execution.id)} className="rounded-md border border-line bg-white px-2.5 py-1.5 text-ink-soft">
                                Retry
                              </button>
                            </div>
                          ) : detail ? (
                            <div className="mt-4 space-y-3">
                              {Boolean(detail.execution.error) && (
                                <DataDisclosure label="Execution error" value={detail.execution.error} />
                              )}
                              <div className="flex items-center justify-between gap-3">
                                <h3 className="text-xs font-semibold text-ink">
                                  Steps ({detail.steps.length})
                                </h3>
                              </div>
                              {detail.steps.length === 0 ? (
                                <p className="text-xs text-muted">No step results were recorded.</p>
                              ) : (
                                <div className="space-y-2">
                                  {detail.steps.map((step, index) => (
                                    <div key={step.id} className="rounded-lg border border-line bg-white p-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-canvas text-[10px] font-semibold text-muted">{index + 1}</span>
                                          <span className="min-w-0 truncate text-xs font-medium text-ink">{step.nodeLabel || step.nodeId}</span>
                                          <span className="text-[10px] text-muted">{step.nodeType}</span>
                                        </div>
                                        <StatusPill status={step.status} />
                                      </div>
                                      <div className="mt-3 space-y-2">
                                        <DataDisclosure label="Input" value={step.input} />
                                        <DataDisclosure label="Output" value={step.output} />
                                        {Boolean(step.error) && <DataDisclosure label="Error" value={step.error} />}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="mt-4 text-xs text-muted">Execution details are not available yet.</p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
