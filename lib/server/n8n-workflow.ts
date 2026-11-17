import { randomUUID } from "node:crypto";
import type { Doc, Step } from "@/lib/flow";

export type N8nNode = {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  webhookId?: string;
};

export type N8nWorkflowPayload = {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, { main: Array<Array<{ node: string; type: "main"; index: number }>> }>;
  settings: { executionOrder: "v1" };
};

function safeName(step: Step, index: number) {
  const cleaned = step.label.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 50);
  return `${String(index + 1).padStart(2, "0")} ${cleaned || step.kind}`;
}

/**
 * Translates the current visual graph to n8n core nodes.
 * Action nodes deliberately emit an action descriptor; they do not claim to
 * perform external side effects until app credentials/integrations are configured.
 */
export function translateWorkflow(doc: Doc, executionId: string): N8nWorkflowPayload {
  const byId = new Map(doc.steps.map((step, index) => [step.id, { step, index }]));
  const triggers = doc.steps.filter((step) => step.kind === "trigger");
  if (triggers.length !== 1) throw new Error("A runnable workflow must contain exactly one trigger.");

  const outgoing = new Map<string, string[]>();
  for (const link of doc.links) {
    if (!byId.has(link.from) || !byId.has(link.to)) throw new Error("Workflow contains a link to a missing step.");
    outgoing.set(link.from, [...(outgoing.get(link.from) ?? []), link.to]);
  }
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (stepId: string) => {
    if (visiting.has(stepId)) throw new Error("Workflow links cannot contain a cycle.");
    if (visited.has(stepId)) return;
    visiting.add(stepId);
    for (const target of outgoing.get(stepId) ?? []) visit(target);
    visiting.delete(stepId);
    visited.add(stepId);
  };
  visit(triggers[0].id);
  if (visited.size !== doc.steps.length) {
    throw new Error("Every step must be connected to the workflow trigger.");
  }

  for (const step of doc.steps) {
    const targets = outgoing.get(step.id) ?? [];
    if (step.kind === "condition" && targets.length > 2) {
      throw new Error("A condition can currently branch to at most two paths.");
    }
    if (step.kind !== "condition" && targets.length > 1) {
      throw new Error(`Step "${step.label}" has multiple outgoing links; add a condition to split the flow.`);
    }
  }

  const webhookPath = `workflows/${executionId}`;
  const webhookName = "Workflow Webhook";
  const nodes: N8nNode[] = [{
    id: randomUUID(),
    name: webhookName,
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [240, 240],
    webhookId: randomUUID(),
    parameters: {
      httpMethod: "POST",
      path: webhookPath,
      responseMode: "onReceived",
      options: {},
    },
  }];

  const nodeNames = new Map<string, string>();
  doc.steps.forEach((step, index) => {
    const name = safeName(step, index);
    nodeNames.set(step.id, name);
    if (step.kind === "condition") {
      const targets = outgoing.get(step.id) ?? [];
      const pathSteps = targets.map((id) => byId.get(id)?.step).filter((step): step is Step => Boolean(step));
      const expectedRole = pathSteps[0]?.match;
      nodes.push({
        id: randomUUID(),
        name,
        type: "n8n-nodes-base.if",
        typeVersion: 2.2,
        position: [480 + index * 220, 240 + index * 100],
        parameters: {
          conditions: {
            options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
            conditions: [{
              id: randomUUID(),
              leftValue: "={{ $json.input?.role ?? $json.body?.input?.role ?? $json.role }}",
              rightValue: expectedRole ?? "",
              operator: { type: "string", operation: "equals" },
            }],
            combinator: "and",
          },
          options: {},
        },
      });
      return;
    }

    nodes.push({
      id: randomUUID(),
      name,
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [480 + index * 220, 240 + index * 100],
      parameters: {
        mode: "runOnceForEachItem",
        jsCode: `const incoming = $json.body ?? $json;\nreturn { json: { ...incoming, _workflow: { executionId: ${JSON.stringify(executionId)}, stepId: ${JSON.stringify(step.id)}, stepKind: ${JSON.stringify(step.kind)}, label: ${JSON.stringify(step.label)}, actions: ${JSON.stringify(step.actions ?? [])} } } };`,
      },
    });
  });

  const connections: N8nWorkflowPayload["connections"] = {};
  const trigger = triggers[0];
  const firstTarget = outgoing.get(trigger.id)?.[0];
  if (!firstTarget) throw new Error("The trigger must connect to at least one step.");
  connections[webhookName] = { main: [[{ node: nodeNames.get(firstTarget)!, type: "main", index: 0 }]] };

  for (const step of doc.steps) {
    const targets = outgoing.get(step.id) ?? [];
    if (!targets.length) continue;
    const name = nodeNames.get(step.id)!;
    if (step.kind === "condition") {
      connections[name] = {
        main: [
          [{ node: nodeNames.get(targets[0])!, type: "main", index: 0 }],
          targets[1] ? [{ node: nodeNames.get(targets[1])!, type: "main", index: 0 }] : [],
        ],
      };
    } else {
      connections[name] = { main: [[{ node: nodeNames.get(targets[0])!, type: "main", index: 0 }]] };
    }
  }

  return {
    name: `Workflows / ${doc.name} / ${executionId.slice(0, 8)}`,
    nodes,
    connections,
    settings: { executionOrder: "v1" },
  };
}

export function webhookUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/webhook/${path}`;
}
