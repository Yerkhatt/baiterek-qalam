import type { FormEdge, FormNode, FormSchema, SwitchRouteValue, NodeType } from "@qalam/form-engine";
import { resolveNodeTypeLenient } from "@qalam/form-engine";
import { getNodeDefinition, getNodeOutputs, NODE_TYPE_REGISTRY, SWITCH_EXTRA_OUTPUT_ID } from "./nodeTypeRegistry";

/** Effective node kind for authoring checks (declared type or inferred from `sign_*` / `integration_call_*` ids). */
function effectiveConstructorNodeType(node: FormNode): NodeType {
  return (
    resolveNodeTypeLenient(node) ?? ((typeof node.type === "string" ? node.type.trim() : "") as NodeType)
  );
}

/** Node card width on constructor canvas (must match `.cnode` CSS). */
export const CONSTRUCTOR_NODE_CARD_WIDTH_PX = 100;

/** Minimum card body height; grows with output count (must match `.cnode` min usage). */
const CONSTRUCTOR_CARD_MIN_HEIGHT_PX = 100;
/** Vertical space per output handle row (px). */
const CONSTRUCTOR_CARD_OUTPUT_ROW_PX = 28;
/** Extra vertical padding inside card for icon (px). */
const CONSTRUCTOR_CARD_BODY_PAD_PX = 36;
const CONSTRUCTOR_CARD_MAX_HEIGHT_PX = 440;
/** Gap between card and meta label + approximate meta line (matches ConstructorNodeCard). */
const CONSTRUCTOR_NODE_META_STACK_PX = 8 + 32;

/**
 * Inner `.cnode` height for a form node — taller when many outputs (e.g. switch branches).
 */
export function estimateConstructorNodeCardHeight(node: FormNode): number {
  const outputs = getNodeOutputs(node);
  const count = Math.max(1, outputs.length);
  const body = Math.max(
    CONSTRUCTOR_CARD_MIN_HEIGHT_PX,
    CONSTRUCTOR_CARD_OUTPUT_ROW_PX * count + CONSTRUCTOR_CARD_BODY_PAD_PX
  );
  return Math.min(CONSTRUCTOR_CARD_MAX_HEIGHT_PX, body);
}

/** Full vertical footprint on canvas: card + label under card. */
export function estimateConstructorNodeOuterHeight(node: FormNode): number {
  return estimateConstructorNodeCardHeight(node) + CONSTRUCTOR_NODE_META_STACK_PX;
}

/** Node card size for layout, edge anchors, and fit-to-viewport (must match CSS). */
export const BUILDER_NODE_WIDTH = 224;
export const BUILDER_NODE_HEIGHT = 68;
/** Port anchors: OUT on right edge, IN on left edge, both at vertical center of header row. */
export const BUILDER_NODE_PORT_OUT_DX = 224;
export const BUILDER_NODE_PORT_OUT_DY = 34;
export const BUILDER_NODE_PORT_IN_DX = 0;
export const BUILDER_NODE_PORT_IN_DY = 34;

export type GraphIssue = {
  messageKey: string;
  params?: Record<string, string | number>;
};

/** True for HTTPS-узла (учебный терминал). */
export function integrationCallIsConfigured(node: FormNode): boolean {
  return effectiveConstructorNodeType(node) === "integration_call";
}

/**
 * True if some path from start reaches an `end` without traversing an integration/sign demo step,
 * or (when there is no `end`) reaches a leaf that is neither `integration_call` nor `sign`.
 */
export function pathFromStartToEndWithoutConfiguredIntegration(
  synced: FormSchema,
  adjacency: Map<string, string[]>
): boolean {
  const byId = new Map(synced.nodes.map((n) => [n.id, n]));
  if (!byId.has(synced.start)) {
    return false;
  }
  const hasEndNode = synced.nodes.some((n) => effectiveConstructorNodeType(n) === "end");

  const stack: Array<{ id: string; seen: boolean }> = [{ id: synced.start, seen: false }];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const cur = stack.pop()!;
    const sig = `${cur.id}:${cur.seen ? "1" : "0"}`;
    if (visited.has(sig)) {
      continue;
    }
    visited.add(sig);

    const node = byId.get(cur.id);
    if (!node) {
      continue;
    }

    let seen = cur.seen;
    const kind = effectiveConstructorNodeType(node);
    if (kind === "integration_call" || kind === "sign") {
      seen = true;
    }

    const outs = adjacency.get(cur.id) ?? [];

    if (hasEndNode) {
      if (effectiveConstructorNodeType(node) === "end") {
        if (!seen) {
          return true;
        }
        continue;
      }
      for (const to of outs) {
        stack.push({ id: to, seen });
      }
      continue;
    }

    if (outs.length === 0) {
      const leafKind = effectiveConstructorNodeType(node);
      if (leafKind === "integration_call" || leafKind === "sign") {
        continue;
      }
      return true;
    }
    for (const to of outs) {
      stack.push({ id: to, seen });
    }
  }
  return false;
}

/** True when some path from start reaches a demo terminal (`integration_call` or `sign`) with no outgoing edges. */
export function hasReachableConfiguredTerminalIntegration(
  synced: FormSchema,
  adjacency: Map<string, string[]>
): boolean {
  const byId = new Map(synced.nodes.map((n) => [n.id, n]));
  if (!byId.has(synced.start)) {
    return false;
  }
  const stack = [synced.start];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) {
      continue;
    }
    visited.add(id);
    const outs = adjacency.get(id) ?? [];
    if (outs.length === 0) {
      const n = byId.get(id);
      const leafKind = n ? effectiveConstructorNodeType(n) : null;
      if (leafKind === "integration_call" || leafKind === "sign") {
        return true;
      }
    }
    for (const to of outs) {
      stack.push(to);
    }
  }
  return false;
}

export function normalizeNext(next?: string | string[]): string[] {
  if (!next) {
    return [];
  }
  return Array.isArray(next) ? next : [next];
}

/** Single source of truth: edges derived from each node's `next`. */
export function deriveEdgesFromNodes(nodes: FormNode[]): FormEdge[] {
  return nodes.flatMap((node) =>
    normalizeNext(node.next).map((to, index) => ({
      id: `${node.id}__${to}__${index}`,
      from: node.id,
      to
    }))
  );
}

function normalizeEdges(edges: FormEdge[] | undefined): FormEdge[] {
  if (!edges || edges.length === 0) {
    return [];
  }
  return edges.map((edge, index) => ({
    ...edge,
    id: edge.id || `${edge.from}__${edge.to}__${index}`
  }));
}

function switchCondition(sourceFieldId: string, value: SwitchRouteValue): unknown {
  return { "==": [{ var: `values.${sourceFieldId}` }, value] };
}

function syncSwitchEdges(nodes: FormNode[], edges: FormEdge[]): FormEdge[] {
  if (edges.length === 0) return edges;
  const byNodeId = new Map(nodes.map((node) => [node.id, node]));

  return edges.flatMap((edge) => {
    const source = byNodeId.get(edge.from);
    if (!source || source.type !== "switch" || !source.switch) {
      return [edge];
    }

    const cfg = source.switch;
    const fallbackExtra = cfg.fallback?.mode === "extra";

    if (cfg.mode === "rules") {
      const routes = cfg.routes ?? [];
      const routeById = new Map(routes.map((route) => [route.id, route]));
      if (!edge.fromPort) {
        return [];
      }
      const isFallbackPort =
        edge.fromPort === SWITCH_EXTRA_OUTPUT_ID || edge.fromPort === "__switch_fallback__";
      if (isFallbackPort) {
        return fallbackExtra ? [{ ...edge, condition: undefined }] : [];
      }
      const route = routeById.get(edge.fromPort);
      if (!route || !cfg.sourceFieldId?.trim()) {
        return [];
      }
      return [
        {
          ...edge,
          condition: switchCondition(cfg.sourceFieldId.trim(), route.value)
        }
      ];
    }

    const outputCount = Math.max(1, Math.floor(cfg.numberOutputs ?? 2));
    const allowedPorts = new Set<string>(Array.from({ length: outputCount }, (_, index) => String(index)));
    if (fallbackExtra) {
      allowedPorts.add(SWITCH_EXTRA_OUTPUT_ID);
      allowedPorts.add("__switch_fallback__");
    }
    if (!edge.fromPort || !allowedPorts.has(edge.fromPort)) {
      return [];
    }
    return [{ ...edge, condition: undefined }];
  });
}

export function deriveNextFromEdges(nodes: FormNode[], edges: FormEdge[]): FormNode[] {
  if (edges.length === 0) {
    return nodes.map((node) => ({ ...node, next: undefined }));
  }
  const grouped = new Map<string, FormEdge[]>();
  for (const edge of edges) {
    const list = grouped.get(edge.from);
    if (list) {
      list.push(edge);
      continue;
    }
    grouped.set(edge.from, [edge]);
  }

  return nodes.map((node) => {
    const outgoing = grouped.get(node.id) ?? [];
    const ordered = [...outgoing].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    const nextTargets = ordered.map((edge) => edge.to);
    const deduped = Array.from(new Set(nextTargets));
    const next =
      deduped.length === 0 ? undefined : deduped.length === 1 ? deduped[0] : deduped;
    return { ...node, next };
  });
}

export function withSyncedEdges(schema: FormSchema): FormSchema {
  // When `edges` is omitted, infer transitions from each node's `next` (legacy / minimal schemas).
  // When `edges` is present — including `[]` after deleting every link — it is authoritative.
  if (schema.edges === undefined) {
    return {
      ...schema,
      edges: deriveEdgesFromNodes(schema.nodes)
    };
  }

  const explicitEdges = syncSwitchEdges(schema.nodes, normalizeEdges(schema.edges));
  return {
    ...schema,
    edges: explicitEdges,
    nodes: deriveNextFromEdges(schema.nodes, explicitEdges)
  };
}

export function clearTransitions(
  next: string | string[] | undefined,
  nodeId: string
): string | string[] | undefined {
  const links = normalizeNext(next).filter((item) => item !== nodeId);
  if (links.length === 0) {
    return undefined;
  }
  return links.length === 1 ? links[0] : links;
}

/** Edges for rendering / engine — always from `next` to avoid drift from stale `edges`. */
export function buildEdgeList(nodes: FormNode[]): FormEdge[] {
  return deriveEdgesFromNodes(nodes);
}

export function buildEdgeListFromSchema(schema: FormSchema): FormEdge[] {
  const synced = withSyncedEdges(schema);
  return synced.edges ?? [];
}

export function validateGraphStructure(schema: FormSchema): GraphIssue[] {
  const synced = withSyncedEdges(schema);
  const issues: GraphIssue[] = [];
  const idSet = new Set(synced.nodes.map((node) => node.id));
  if (!idSet.has(synced.start)) {
    issues.push({ messageKey: "forms.graph_start_missing" });
  }
  const starts = synced.nodes.filter((node) => node.type === "start");
  if (starts.length !== 1) {
    issues.push({
      messageKey: "forms.graph_start_count_invalid",
      params: { count: starts.length }
    });
  }

  for (const [type, definition] of Object.entries(NODE_TYPE_REGISTRY)) {
    if (!definition.maxCount) {
      continue;
    }
    const count = synced.nodes.filter((node) => node.type === type).length;
    if (count > definition.maxCount) {
      issues.push({
        messageKey: "forms.graph_node_type_limit_exceeded",
        params: { type, maxCount: definition.maxCount, count }
      });
    }
  }

  const edgeList = buildEdgeListFromSchema(synced);
  edgeList.forEach((edge) => {
    if (!idSet.has(edge.from) || !idSet.has(edge.to)) {
      issues.push({
        messageKey: "forms.graph_broken_edge",
        params: { from: edge.from, to: edge.to }
      });
    }
  });

  const adjacency = new Map<string, string[]>();
  for (const node of synced.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edgeList) {
    if (!adjacency.has(edge.from)) {
      continue;
    }
    adjacency.get(edge.from)!.push(edge.to);
  }

  const hasEndType = synced.nodes.some((node) => node.type === "end");
  if (!hasEndType && !hasReachableConfiguredTerminalIntegration(synced, adjacency)) {
    issues.push({ messageKey: "forms.graph_end_recommended" });
  }

  if (pathFromStartToEndWithoutConfiguredIntegration(synced, adjacency)) {
    issues.push({ messageKey: "forms.graph_path_without_integration" });
  }

  const startId = synced.start;
  const visited = new Set<string>();
  if (adjacency.has(startId)) {
    const stack = [startId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      const next = adjacency.get(current) ?? [];
      for (const target of next) {
        if (!visited.has(target)) {
          stack.push(target);
        }
      }
    }
  }

  for (const node of synced.nodes) {
    if (!visited.has(node.id)) {
      issues.push({
        messageKey: "forms.graph_node_unreachable",
        params: { nodeId: node.id }
      });
    }
  }

  for (const node of synced.nodes) {
    const kind = effectiveConstructorNodeType(node);
    if (kind === "end" || kind === "integration_call" || kind === "sign") {
      continue;
    }
    const outgoing = adjacency.get(node.id) ?? [];
    if (outgoing.length === 0) {
      issues.push({
        messageKey: "forms.graph_node_dead_end",
        params: { nodeId: node.id }
      });
    }
  }

  for (const node of synced.nodes) {
    const kind = effectiveConstructorNodeType(node);
    if (!(kind in NODE_TYPE_REGISTRY)) {
      continue;
    }
    const validationIssues = getNodeDefinition(kind).validate(node);
    for (const issue of validationIssues) {
      issues.push({
        messageKey: "forms.graph_node_settings_invalid",
        params: {
          nodeId: node.id,
          key: issue.key,
          message: issue.message
        }
      });
    }
  }

  return issues;
}

/** Cubic Bezier between two port points; `bend` offsets control points horizontally. */
export function bezierEdgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  edgeIndex = 0
): string {
  const dx = Math.max(80, Math.abs(x2 - x1) * 0.5);
  const stagger = edgeIndex * 12;
  const cx1 = x1 + dx + stagger;
  const cy1 = y1;
  const cx2 = x2 - dx - stagger;
  const cy2 = y2;
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

export function nodesBoundingBox(
  positions: Record<string, { x: number; y: number }>,
  nodeIds: string[],
  pad = 48,
  nodesById?: Map<string, FormNode>
): BBox | null {
  if (nodeIds.length === 0) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of nodeIds) {
    const p = positions[id];
    if (!p) {
      continue;
    }
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    const node = nodesById?.get(id);
    const w = node ? CONSTRUCTOR_NODE_CARD_WIDTH_PX : BUILDER_NODE_WIDTH;
    const h = node ? estimateConstructorNodeOuterHeight(node) : BUILDER_NODE_HEIGHT;
    maxX = Math.max(maxX, p.x + w);
    maxY = Math.max(maxY, p.y + h);
  }
  if (!Number.isFinite(minX)) {
    return null;
  }
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad
  };
}

/** Compute zoom and pan so bbox fits inside viewport (CSS pixels). */
/** Horizontal spacing for constructor auto-layout (LR flow, like n8n). */
const AUTO_LAYOUT_COL_GAP = 280;
/** Vertical gap between stacked node bounding boxes within one layer. */
const AUTO_LAYOUT_STACK_GUTTER_PX = 36;

/**
 * Top-left Y for each node id in one layer: stack by true outer heights + gutter, then center vertically.
 */
function layerStackTopById(rowIds: string[], nodesById: Map<string, FormNode>): Record<string, number> {
  const out: Record<string, number> = {};
  const n = rowIds.length;
  if (n === 0) {
    return out;
  }
  const heights = rowIds.map((id) => {
    const node = nodesById.get(id);
    return node ? estimateConstructorNodeOuterHeight(node) : 0;
  });
  const G = AUTO_LAYOUT_STACK_GUTTER_PX;
  const total = heights.reduce((a, h) => a + h, 0) + (n - 1) * G;
  const offset = -total / 2;
  let y = offset;
  for (let i = 0; i < n; i++) {
    out[rowIds[i]] = y;
    y += heights[i] + (i < n - 1 ? G : 0);
  }
  return out;
}

/**
 * Assigns positions by longest-path rank from `schema.start` (layered DAG layout).
 */
export function applyAutoLayout(schema: FormSchema): FormSchema {
  const nodes = schema.nodes;
  if (nodes.length === 0) {
    return withSyncedEdges(schema);
  }
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const idSet = new Set(nodes.map((n) => n.id));
  const level: Record<string, number> = {};
  for (const n of nodes) {
    level[n.id] = 0;
  }
  if (idSet.has(schema.start)) {
    level[schema.start] = 0;
  }

  const iterations = nodes.length + 2;
  for (let i = 0; i < iterations; i++) {
    for (const n of nodes) {
      const targets = normalizeNext(n.next);
      for (const t of targets) {
        if (idSet.has(t)) {
          level[t] = Math.max(level[t], level[n.id] + 1);
        }
      }
    }
  }

  const byLevel = new Map<number, string[]>();
  for (const n of nodes) {
    const L = level[n.id] ?? 0;
    if (!byLevel.has(L)) {
      byLevel.set(L, []);
    }
    byLevel.get(L)!.push(n.id);
  }
  for (const [, ids] of byLevel) {
    ids.sort();
  }

  const yByNodeId: Record<string, number> = {};
  for (const [, rowIds] of byLevel) {
    const tops = layerStackTopById(rowIds, nodesById);
    for (const id of rowIds) {
      yByNodeId[id] = tops[id] ?? 0;
    }
  }

  return withSyncedEdges({
    ...schema,
    nodes: nodes.map((n) => {
      const L = level[n.id] ?? 0;
      const y = yByNodeId[n.id] ?? 0;
      const x = L * AUTO_LAYOUT_COL_GAP;
      return { ...n, position: { x, y } };
    })
  });
}

export function fitViewportToNodes(
  viewportWidth: number,
  viewportHeight: number,
  bbox: BBox,
  minZoom = 0.35,
  maxZoom = 1.8
): { zoom: number; panX: number; panY: number } {
  const bw = bbox.maxX - bbox.minX;
  const bh = bbox.maxY - bbox.minY;
  if (bw <= 0 || bh <= 0) {
    return { zoom: 1, panX: 0, panY: 0 };
  }
  const scale = Math.min(viewportWidth / bw, viewportHeight / bh, maxZoom);
  const zoom = Math.max(minZoom, scale);
  const worldCx = (bbox.minX + bbox.maxX) / 2;
  const worldCy = (bbox.minY + bbox.maxY) / 2;
  const panX = viewportWidth / 2 - worldCx * zoom;
  const panY = viewportHeight / 2 - worldCy * zoom;
  return { zoom, panX, panY };
}
