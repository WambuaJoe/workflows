import type { N8nWorkflowPayload } from "./n8n-workflow";
import { webhookUrl } from "./n8n-workflow";

type N8nExecutionSummary = {
  id: string;
  workflowId: string;
  status?: string;
  finished?: boolean;
  startedAt?: string;
  stoppedAt?: string;
};

type N8nExecutionDetail = N8nExecutionSummary & {
  data?: {
    resultData?: {
      runData?: Record<string, Array<{
        data?: { main?: Array<Array<{ json?: unknown }>> };
        error?: unknown;
        startTime?: number;
        executionTime?: number;
      }>>;
      lastNodeExecuted?: string;
      error?: unknown;
    };
  };
};

function config() {
  const apiUrl = process.env.N8N_API_URL?.replace(/\/+$/, "");
  const apiKey = process.env.N8N_API_KEY;
  const webhookBase = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/+$/, "");
  if (!apiUrl || !apiKey || !webhookBase) {
    throw new Error("n8n is not configured. Set N8N_API_URL, N8N_API_KEY and N8N_WEBHOOK_BASE_URL.");
  }
  return { apiUrl, apiKey, webhookBase };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiUrl, apiKey } = config();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-N8N-API-KEY": apiKey,
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("n8n API request failed", { path, status: response.status, detail: detail.slice(0, 500) });
    throw new Error(`n8n API request failed with status ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export async function createAndActivateWorkflow(workflow: N8nWorkflowPayload) {
  const created = await api<{ id: string }>("/workflows", {
    method: "POST",
    body: JSON.stringify(workflow),
  });
  if (!created.id) throw new Error("n8n did not return a workflow ID.");
  await api(`/workflows/${encodeURIComponent(created.id)}/activate`, { method: "POST" });
  return created.id;
}

export async function dispatchWebhook(path: string, payload: Record<string, unknown>) {
  const { webhookBase } = config();
  const response = await fetch(webhookUrl(webhookBase, path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("n8n webhook dispatch failed", { status: response.status, detail: detail.slice(0, 500) });
    throw new Error(`n8n webhook rejected the execution with status ${response.status}.`);
  }
}

export async function listWorkflowExecutions(workflowId: string) {
  const result = await api<{ data?: N8nExecutionSummary[] }>(
    `/executions?workflowId=${encodeURIComponent(workflowId)}&limit=1`,
  );
  return result.data?.[0] ?? null;
}

export async function getExecution(executionId: string) {
  return api<N8nExecutionDetail>(`/executions/${encodeURIComponent(executionId)}?includeData=true`);
}
