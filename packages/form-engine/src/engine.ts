import jsonLogic from "json-logic-js";
import {
  EvaluationResult,
  FormEdge,
  FormNode,
  FormSchema,
  IntegrationAdapterRequest,
  IntegrationExecutor,
  Rule,
  RuleAction,
  RuleEvent,
  RuntimeState,
  SWITCH_EXTRA_OUTPUT_ID,
  SwitchRouteValue,
} from "./types";
import { getPath, isEmpty, setPath } from "./utils";
import { validateFieldValue } from "./validators";

const ACTION_PHASES: Array<{ phase: string; types: RuleAction["type"][] }> = [
  { phase: "calculations", types: ["set_value"] },
  { phase: "visibility", types: ["set_visible"] },
  { phase: "required", types: ["set_required"] },
  { phase: "validation", types: ["set_error"] },
  { phase: "branching", types: ["goto"] },
];

export function evaluateNode(
  schema: FormSchema,
  state: RuntimeState,
  nodeId: string
): EvaluationResult {
  const node = findNode(schema, nodeId);
  const nextState = normalizeState(state, nodeId);
  return evaluateNodeInternal(schema, nextState, node, undefined);
}

export async function evaluateNodeAsync(
  schema: FormSchema,
  state: RuntimeState,
  nodeId: string,
  executor?: IntegrationExecutor
): Promise<EvaluationResult> {
  const node = findNode(schema, nodeId);
  const nextState = normalizeState(state, nodeId);
  return evaluateNodeInternal(schema, nextState, node, executor);
}

function evaluateNodeInternal(
  schema: FormSchema,
  nextState: RuntimeState,
  node: FormNode,
  executor?: IntegrationExecutor
): EvaluationResult {
  const ctx = buildContext(schema, nextState);
  const events: RuleEvent[] = [];
  let gotoNodeId: string | undefined;

  for (const phase of ACTION_PHASES) {
    const result = runRules(node.rules ?? [], ctx, nextState, phase.types);
    if (result.gotoNodeId && !gotoNodeId) {
      gotoNodeId = result.gotoNodeId;
    }
    events.push(...result.events);
  }

  applyFieldDefaults(node, nextState);
  validateNodeFields(node, schema, nextState, ctx);

  if (executor && node.type === "integration_call" && node.integration) {
    throw new Error("Use evaluateNodeAsync for integration execution");
  }
  if (node.type === "integration_call" && node.integration) {
    executeIntegrationNodeSync(node, nextState, ctx);
  }

  const nodeErrors = hasNodeErrors(nextState, node);
  nextState.stepStatus = nextState.stepStatus ?? {};
  nextState.stepStatus[node.id] = nodeErrors ? "invalid" : "complete";
  const transitions = resolveTransitions(schema, node, ctx, gotoNodeId);

  return {
    state: nextState,
    nextNodeId: transitions[0],
    transitions,
    events,
  };
}

export async function evaluateNodeWithExecutor(
  schema: FormSchema,
  state: RuntimeState,
  nodeId: string,
  executor?: IntegrationExecutor
): Promise<EvaluationResult> {
  const node = findNode(schema, nodeId);
  const nextState = normalizeState(state, nodeId);
  const ctx = buildContext(schema, nextState);
  const events: RuleEvent[] = [];
  let gotoNodeId: string | undefined;

  for (const phase of ACTION_PHASES) {
    const result = runRules(node.rules ?? [], ctx, nextState, phase.types);
    if (result.gotoNodeId && !gotoNodeId) {
      gotoNodeId = result.gotoNodeId;
    }
    events.push(...result.events);
  }

  applyFieldDefaults(node, nextState);
  validateNodeFields(node, schema, nextState, ctx);
  if (node.type === "integration_call" && node.integration) {
    await executeIntegrationNodeAsync(node, nextState, ctx, executor);
  }

  const nodeErrors = hasNodeErrors(nextState, node);
  nextState.stepStatus = nextState.stepStatus ?? {};
  nextState.stepStatus[node.id] = nodeErrors ? "invalid" : "complete";
  const transitions = resolveTransitions(schema, node, ctx, gotoNodeId);

  return {
    state: nextState,
    nextNodeId: transitions[0],
    transitions,
    events
  };
}

function normalizeState(state: RuntimeState, nodeId: string): RuntimeState {
  return {
    ...state,
    currentNodeId: nodeId,
    values: { ...(state.values ?? {}) },
    files: { ...(state.files ?? {}) },
    errors: { ...(state.errors ?? {}) },
    visibility: { ...(state.visibility ?? {}) },
    required: { ...(state.required ?? {}) },
    stepStatus: { ...(state.stepStatus ?? {}) },
  };
}

function buildContext(schema: FormSchema, state: RuntimeState): Record<string, unknown> {
  return {
    values: state.values,
    files: state.files ?? {},
    integration: state.integrationResults ?? {},
    dictionaries: schema.dictionaries ?? {},
    now: new Date().toISOString(),
  };
}

function findNode(schema: FormSchema, nodeId: string): FormNode {
  const node = schema.nodes.find((item) => item.id === nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  return node;
}

function runRules(
  rules: Rule[],
  ctx: Record<string, unknown>,
  state: RuntimeState,
  actionTypes: RuleAction["type"][]
): { events: RuleEvent[]; gotoNodeId?: string } {
  const events: RuleEvent[] = [];
  let gotoNodeId: string | undefined;

  for (const rule of rules) {
    const shouldRun = rule.when ? Boolean(jsonLogic.apply(rule.when, ctx)) : true;
    if (!shouldRun) {
      continue;
    }
    for (const action of rule.then) {
      if (!actionTypes.includes(action.type)) {
        continue;
      }
      switch (action.type) {
        case "set_value":
          setPath(state.values ?? {}, action.path, resolveValue(action.value, ctx));
          break;
        case "set_visible":
          state.visibility = state.visibility ?? {};
          state.visibility[action.path] = action.value;
          break;
        case "set_required":
          state.required = state.required ?? {};
          state.required[action.path] = action.value;
          break;
        case "set_error":
          state.errors = state.errors ?? {};
          state.errors[action.path] = action.messageKey;
          break;
        case "goto":
          if (!gotoNodeId) {
            gotoNodeId = action.nodeId;
          }
          break;
        case "emit_event":
          events.push({ name: action.name, payload: action.payload });
          break;
        default:
          break;
      }
    }
  }

  return { events, gotoNodeId };
}

function resolveValue(value: unknown, ctx: Record<string, unknown>): unknown {
  if (value && typeof value === "object") {
    try {
      return jsonLogic.apply(value, ctx);
    } catch {
      return value;
    }
  }
  return value;
}

function applyFieldDefaults(node: FormNode, state: RuntimeState): void {
  for (const field of node.fields ?? []) {
    if (state.values && getPath(state.values, field.id) == null && field.default != null) {
      setPath(state.values, field.id, field.default);
    }
  }
}

/** Keys produced only by validateNodeFields / validateFieldValue (not rule `set_error`). Used to drop stale errors after a field becomes valid. */
const STRUCTURAL_VALIDATION_KEYS = new Set<string>([
  "validation.required",
  "validation.min",
  "validation.max",
  "validation.minLength",
  "validation.maxLength",
  "validation.regex",
  "validation.enum",
  "validation.date",
  "validation.date.min",
  "validation.date.max",
  "validation.precision",
  "validation.file.mime",
  "validation.file.maxSize",
  "validation.file.maxCount"
]);

function validateNodeFields(
  node: FormNode,
  schema: FormSchema,
  state: RuntimeState,
  ctx: Record<string, unknown>
): void {
  const errors: Record<string, string> = {};

  for (const field of node.fields ?? []) {
    const visible = state.visibility?.[field.id] ?? true;
    if (!visible) {
      continue;
    }

    const value = state.values ? getPath(state.values, field.id) : undefined;
    const required = resolveRequired(field.required, node.rules ?? [], ctx, field.id, state);

    if (required && isEmpty(value)) {
      errors[field.id] = "validation.required";
      continue;
    }

    const validationError = validateFieldValue(field, value);
    if (validationError) {
      errors[field.id] = validationError;
    }
  }

  if (node.type === "document_request") {
    for (const doc of node.documents ?? []) {
      const fileList = state.files?.[doc.id] ?? [];
      const required = resolveRequired(doc.required, node.rules ?? [], ctx, doc.id, state);
      if (required && fileList.length === 0) {
        errors[doc.id] = "validation.required";
        continue;
      }
      if (doc.file_types && fileList.some((file) => file.mimeType && !doc.file_types?.includes(file.mimeType))) {
        errors[doc.id] = "validation.file.mime";
      }
      if (typeof doc.max_size_mb === "number") {
        const tooLarge = fileList.some(
          (file) => typeof file.sizeMb === "number" && file.sizeMb > doc.max_size_mb!
        );
        if (tooLarge) {
          errors[doc.id] = "validation.file.maxSize";
        }
      }
      if (typeof doc.max_count === "number" && fileList.length > doc.max_count) {
        errors[doc.id] = "validation.file.maxCount";
      }
    }
  }

  const merged = { ...(state.errors ?? {}) };

  for (const field of node.fields ?? []) {
    const visible = state.visibility?.[field.id] ?? true;
    if (!visible) {
      continue;
    }
    if (!errors[field.id]) {
      const prev = merged[field.id];
      if (prev && STRUCTURAL_VALIDATION_KEYS.has(prev)) {
        delete merged[field.id];
      }
    }
  }

  if (node.type === "document_request") {
    for (const doc of node.documents ?? []) {
      if (!errors[doc.id]) {
        const prev = merged[doc.id];
        if (prev && STRUCTURAL_VALIDATION_KEYS.has(prev)) {
          delete merged[doc.id];
        }
      }
    }
  }

  state.errors = { ...merged, ...errors };
  state.required = state.required ?? {};
}

function resolveRequired(
  required: boolean | string | undefined,
  rules: Rule[],
  ctx: Record<string, unknown>,
  id: string,
  state: RuntimeState
): boolean {
  if (typeof required === "boolean") {
    return required;
  }
  if (typeof required === "string") {
    const rule = rules.find((item) => item.id === required);
    if (rule) {
      return rule.when ? Boolean(jsonLogic.apply(rule.when, ctx)) : true;
    }
  }
  return state.required?.[id] ?? false;
}

function resolveNext(node: FormNode): string | undefined {
  if (Array.isArray(node.next)) {
    return node.next[0];
  }
  return node.next;
}

function resolveTransitions(
  schema: FormSchema,
  node: FormNode,
  ctx: Record<string, unknown>,
  gotoNodeId?: string
): string[] {
  if (gotoNodeId) {
    return [gotoNodeId];
  }
  const edges = normalizeEdges(schema, node.id);
  if (node.type === "switch" && node.switch) {
    return resolveSwitchTransitions(node, ctx, edges);
  }
  const matched = edges
    .filter((edge) => {
      if (!edge.condition) {
        return true;
      }
      return Boolean(jsonLogic.apply(edge.condition, ctx));
    })
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .map((edge) => edge.to);
  if (matched.length > 0) {
    return matched;
  }
  const fallback = resolveNext(node);
  return fallback ? [fallback] : [];
}

function sameSwitchValue(left: unknown, right: SwitchRouteValue): boolean {
  return left === right;
}

function sortByPriority(edges: FormEdge[]): FormEdge[] {
  return [...edges].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}

function resolveSwitchTransitions(
  node: FormNode,
  ctx: Record<string, unknown>,
  edges: FormEdge[]
): string[] {
  const cfg = node.switch;
  if (!cfg) return [];

  const byPort = new Map<string, FormEdge[]>();
  for (const edge of edges) {
    if (!edge.fromPort) continue;
    const list = byPort.get(edge.fromPort);
    if (list) list.push(edge);
    else byPort.set(edge.fromPort, [edge]);
  }
  const fallbackPort = SWITCH_EXTRA_OUTPUT_ID || "__switch_fallback__";

  if (cfg.mode === "expression") {
    let rawIndex: unknown = cfg.expression;
    if (cfg.expression && typeof cfg.expression === "object") {
      try {
        rawIndex = jsonLogic.apply(cfg.expression, ctx);
      } catch {
        rawIndex = undefined;
      }
    }

    const parsedIndex =
      typeof rawIndex === "number"
        ? rawIndex
        : typeof rawIndex === "string" && rawIndex.trim() !== ""
          ? Number(rawIndex)
          : NaN;
    const outputIndex =
      Number.isInteger(parsedIndex) && parsedIndex >= 0 ? String(parsedIndex) : undefined;
    if (outputIndex) {
      const routed = sortByPriority(byPort.get(outputIndex) ?? []).map((edge) => edge.to);
      if (routed.length > 0) {
        return routed;
      }
    }

    if (cfg.fallback?.mode === "existing") {
      return sortByPriority(byPort.get(cfg.fallback.routeId) ?? []).map((edge) => edge.to);
    }
    if (cfg.fallback?.mode === "extra") {
      return sortByPriority(byPort.get(fallbackPort) ?? byPort.get("__switch_fallback__") ?? []).map((edge) => edge.to);
    }
    return [];
  }

  const sourceFieldId = cfg.sourceFieldId?.trim();
  if (!sourceFieldId) return [];
  const value = getPath(ctx, `values.${sourceFieldId}`);
  const matchedRouteIds = (cfg.routes ?? [])
    .filter((route) => sameSwitchValue(value, route.value))
    .map((route) => route.id);

  if (matchedRouteIds.length > 0) {
    const routeIds = cfg.allMatchingOutputs ? matchedRouteIds : [matchedRouteIds[0]];
    return routeIds.flatMap((routeId) => sortByPriority(byPort.get(routeId) ?? []).map((edge) => edge.to));
  }

  if (cfg.fallback?.mode === "existing") {
    return sortByPriority(byPort.get(cfg.fallback.routeId) ?? []).map((edge) => edge.to);
  }
  if (cfg.fallback?.mode === "extra") {
    return sortByPriority(byPort.get(fallbackPort) ?? byPort.get("__switch_fallback__") ?? []).map((edge) => edge.to);
  }
  return [];
}

function normalizeEdges(schema: FormSchema, nodeId: string): FormEdge[] {
  if (schema.edges && schema.edges.length > 0) {
    return schema.edges.filter((edge) => edge.from === nodeId);
  }
  const source = schema.nodes.find((item) => item.id === nodeId);
  if (!source) {
    return [];
  }
  const nextIds = Array.isArray(source.next) ? source.next : source.next ? [source.next] : [];
  return nextIds.map((to, index) => ({ id: `${nodeId}__${to}__${index}`, from: nodeId, to }));
}

function hasNodeErrors(state: RuntimeState, node: FormNode): boolean {
  const ids = new Set<string>([...(node.fields ?? []).map((field) => field.id), ...(node.documents ?? []).map((doc) => doc.id)]);
  if (node.type === "integration_call" && node.integration) {
    ids.add(`integration.${node.integration.id}`);
  }
  return Object.keys(state.errors ?? {}).some((key) => ids.has(key));
}

function executeIntegrationNodeSync(
  node: FormNode,
  state: RuntimeState,
  ctx: Record<string, unknown>
): void {
  const integration = node.integration;
  if (!integration) {
    return;
  }
  state.integrationResults = state.integrationResults ?? {};
  const payload = mapPayload(integration.payload_map, ctx);
  state.integrationResults[integration.id] = {
    success: true,
    data: { mocked: true, adapter: integration.adapter, payload }
  };
}

async function executeIntegrationNodeAsync(
  node: FormNode,
  state: RuntimeState,
  ctx: Record<string, unknown>,
  executor?: IntegrationExecutor
): Promise<void> {
  const integration = node.integration;
  if (!integration) {
    return;
  }
  if (!executor) {
    executeIntegrationNodeSync(node, state, ctx);
    return;
  }

  state.integrationResults = state.integrationResults ?? {};
  state.errors = state.errors ?? {};
  const request: IntegrationAdapterRequest = {
    node,
    integration,
    state,
    context: ctx
  };
  const response = await executor.execute(request);
  state.integrationResults[integration.id] = {
    success: response.success,
    statusCode: response.statusCode,
    data: response.data,
    error: response.error
  };

  if (!response.success) {
    if (!(integration.continue_on_error ?? node.execution?.continueOnError)) {
      state.errors[`integration.${integration.id}`] = response.error ?? "integration.failed";
    }
    return;
  }

  if (integration.store_as) {
    setPath(state.values, integration.store_as, response.data);
  }
  for (const [source, target] of Object.entries(integration.response_map ?? {})) {
    const value = getPath(response.data as Record<string, unknown>, source);
    if (value !== undefined) {
      setPath(state.values, target, value);
    }
  }
}

function mapPayload(payloadMap: Record<string, unknown>, ctx: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payloadMap)) {
    payload[key] = resolveValue(value, ctx);
  }
  return payload;
}

/** Resolve `payload_map` entries through JSONLogic using the same context as the engine runtime. */
export function materializeIntegrationPayload(
  payloadMap: Record<string, unknown>,
  ctx: Record<string, unknown>
): Record<string, unknown> {
  return mapPayload(payloadMap, ctx);
}
