import { EvaluationResult, FormSchema, RuleEvent, RuntimeState } from "@qalam/form-engine";
import { apiFetch } from "@/lib/api";

export type RuntimeSnapshot = {
  appId: string;
  nodeId: string;
  history: string[];
  state: RuntimeState;
  events: RuleEvent[];
};

export type AnalyticsStats = {
  total: number;
  counts: Record<string, number>;
};

export async function upsertApplication(appId: string, serviceId: string): Promise<void> {
  await apiFetch(`/applications/${appId}`, {
    method: "PUT",
    body: JSON.stringify({ serviceId })
  });
}

export async function fetchRuntime(appId: string): Promise<RuntimeSnapshot | null> {
  try {
    return await apiFetch<RuntimeSnapshot>(`/applications/${appId}/runtime`);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) {
      return null;
    }
    if (status === undefined) {
      return null;
    }
    throw error;
  }
}

export async function saveRuntime(appId: string, snapshot: RuntimeSnapshot): Promise<void> {
  await apiFetch(`/applications/${appId}/runtime`, {
    method: "PUT",
    body: JSON.stringify(snapshot)
  });
}

export async function submitApplication(appId: string, snapshot?: RuntimeSnapshot): Promise<void> {
  await apiFetch(`/applications/${appId}/submit`, {
    method: "POST",
    body: JSON.stringify(snapshot ?? {})
  });
}

export async function fetchEventStats(): Promise<AnalyticsStats> {
  return apiFetch<AnalyticsStats>("/analytics/events");
}

export async function evaluateRuntimeNode(
  schema: FormSchema,
  state: RuntimeState,
  nodeId: string
): Promise<EvaluationResult> {
  return apiFetch<EvaluationResult>("/form-runtime/evaluate", {
    method: "POST",
    body: JSON.stringify({ schema, state, nodeId })
  });
}
