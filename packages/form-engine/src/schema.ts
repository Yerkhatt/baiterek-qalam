import { FormEdge, FormNode, FormSchema, SwitchRouteValue, ValidationResult, NodeType } from "./types";

const NODE_TYPES = new Set<NodeType>([
  "start",
  "step",
  "branch",
  "switch",
  "validation_gate",
  "calculation",
  "document_request",
  "integration_call",
  "approval",
  "sign",
  "end",
]);

function normalizedNodeType(node: FormNode): string {
  return typeof node.type === "string" ? node.type.trim() : "";
}

/**
 * Declared type if known; otherwise infer from constructor id prefixes (`sign_*`, `integration_call_*`).
 * Keeps demo / example nodes publishable when `type` was lost or mangled in storage.
 */
export function resolveNodeTypeLenient(node: FormNode): NodeType | undefined {
  const raw = normalizedNodeType(node);
  if (NODE_TYPES.has(raw as NodeType)) {
    return raw as NodeType;
  }
  const id = node.id ?? "";
  if (id.startsWith("sign_")) {
    return "sign";
  }
  if (id.startsWith("integration_call_")) {
    return "integration_call";
  }
  return undefined;
}

function effectiveNodeKind(node: FormNode): string {
  return resolveNodeTypeLenient(node) ?? normalizedNodeType(node);
}

function isValidTerminalLeaf(node: FormNode): boolean {
  const t = effectiveNodeKind(node);
  return t === "end" || t === "integration_call" || t === "sign";
}

export function validateSchema(schema: FormSchema): ValidationResult {
  const errors: string[] = [];
  const allFieldIds = new Set<string>();
  for (const node of schema.nodes ?? []) {
    for (const field of node.fields ?? []) {
      allFieldIds.add(field.id);
    }
  }

  if (!schema || typeof schema !== "object") {
    return { valid: false, errors: ["schema.invalid"] };
  }

  if (typeof schema.schemaVersion !== "number") {
    errors.push("schema.schemaVersion.missing");
  }

  if (schema.metadata) {
    if (typeof schema.metadata.title !== "string" || schema.metadata.title.trim().length === 0) {
      errors.push("schema.metadata.title.required");
    }
    if (schema.metadata.requirements && !Array.isArray(schema.metadata.requirements)) {
      errors.push("schema.metadata.requirements.invalid");
    }
    if (schema.metadata.documents && !Array.isArray(schema.metadata.documents)) {
      errors.push("schema.metadata.documents.invalid");
    }
    if (schema.metadata.stages && !Array.isArray(schema.metadata.stages)) {
      errors.push("schema.metadata.stages.invalid");
    }
  }

  if (!schema.start) {
    errors.push("schema.start.missing");
  }

  const nodeIds = new Set<string>();
  for (const node of schema.nodes ?? []) {
    if (!node.id) {
      errors.push("schema.node.id.missing");
      continue;
    }
    if (nodeIds.has(node.id)) {
      errors.push(`schema.node.duplicate:${node.id}`);
    }
    nodeIds.add(node.id);

    if (!NODE_TYPES.has(effectiveNodeKind(node) as NodeType)) {
      errors.push(`schema.node.type.invalid:${node.id}`);
    }

    if (node.fields) {
      const fieldIds = new Set<string>();
      for (const field of node.fields) {
        if (fieldIds.has(field.id)) {
          errors.push(`schema.field.duplicate:${node.id}.${field.id}`);
        }
        fieldIds.add(field.id);
      }
    }

    if (normalizedNodeType(node) === "switch") {
      validateSwitchNode(node, allFieldIds, errors);
    }
  }

  if (schema.start && !nodeIds.has(schema.start)) {
    errors.push("schema.start.not_found");
  }

  const edges = normalizeEdges(schema);
  const edgeIds = new Set<string>();
  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();

  for (const edge of edges) {
    if (edgeIds.has(edge.id)) {
      errors.push(`schema.edge.duplicate:${edge.id}`);
    }
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      errors.push(`schema.edge.invalid:${edge.id}`);
    }
    outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + 1);
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  }

  for (const node of schema.nodes ?? []) {
    const nextIds = Array.isArray(node.next) ? node.next : node.next ? [node.next] : [];
    for (const nextId of nextIds) {
      if (!nodeIds.has(nextId)) {
        errors.push(`schema.node.next.invalid:${node.id}->${nextId}`);
      }
    }
    const outgoingCount = outgoing.get(node.id) ?? nextIds.length;
    if (outgoingCount === 0 && !isValidTerminalLeaf(node)) {
      errors.push(`schema.node.dead_end:${node.id}`);
    }
  }

  const visited = traverse(schema.start, edges);
  for (const node of schema.nodes ?? []) {
    if (!visited.has(node.id)) {
      errors.push(`schema.node.unreachable:${node.id}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function serializeSwitchValue(value: SwitchRouteValue): string {
  return typeof value === "string" ? `str:${value}` : typeof value === "number" ? `num:${value}` : `bool:${value}`;
}

function validateSwitchNode(
  node: FormSchema["nodes"][number],
  allFieldIds: Set<string>,
  errors: string[]
): void {
  const cfg = node.switch;
  if (!cfg) {
    errors.push(`schema.switch.missing:${node.id}`);
    return;
  }

  if (cfg.mode !== "rules" && cfg.mode !== "expression") {
    errors.push(`schema.switch.mode.invalid:${node.id}`);
  }

  if (cfg.mode === "rules") {
    if (!cfg.sourceFieldId?.trim()) {
      errors.push(`schema.switch.source_field.required:${node.id}`);
    } else if (!allFieldIds.has(cfg.sourceFieldId.trim())) {
      errors.push(`schema.switch.source_field.invalid:${node.id}`);
    }

    if (!Array.isArray(cfg.routes) || cfg.routes.length === 0) {
      errors.push(`schema.switch.routes.required:${node.id}`);
    } else {
      const routeIds = new Set<string>();
      const routeValues = new Set<string>();
      for (const route of cfg.routes) {
        if (!route.id?.trim()) {
          errors.push(`schema.switch.route_id.required:${node.id}`);
          continue;
        }
        if (routeIds.has(route.id)) {
          errors.push(`schema.switch.route_id.duplicate:${node.id}.${route.id}`);
        }
        routeIds.add(route.id);

        const encoded = serializeSwitchValue(route.value);
        if (routeValues.has(encoded)) {
          errors.push(`schema.switch.route_value.duplicate:${node.id}.${route.id}`);
        }
        routeValues.add(encoded);
      }

      if (cfg.fallback?.mode === "existing") {
        if (!cfg.fallback.routeId?.trim()) {
          errors.push(`schema.switch.fallback_route.required:${node.id}`);
        } else if (!routeIds.has(cfg.fallback.routeId)) {
          errors.push(`schema.switch.fallback_route.invalid:${node.id}`);
        }
      }
    }
  }

  if (cfg.mode === "expression") {
    if (cfg.expression === undefined || cfg.expression === null) {
      errors.push(`schema.switch.expression.required:${node.id}`);
    }
    if (
      typeof cfg.numberOutputs !== "number" ||
      !Number.isFinite(cfg.numberOutputs) ||
      cfg.numberOutputs <= 0 ||
      !Number.isInteger(cfg.numberOutputs)
    ) {
      errors.push(`schema.switch.number_outputs.invalid:${node.id}`);
    }
  }
}

function normalizeEdges(schema: FormSchema): FormEdge[] {
  if (schema.edges && schema.edges.length > 0) {
    return schema.edges;
  }
  return (schema.nodes ?? []).flatMap((node) => {
    const nextIds = Array.isArray(node.next) ? node.next : node.next ? [node.next] : [];
    return nextIds.map((to, index) => ({
      id: `${node.id}__${to}__${index}`,
      from: node.id,
      to
    }));
  });
}

function traverse(start: string, edges: FormEdge[]): Set<string> {
  const graph = new Map<string, string[]>();
  for (const edge of edges) {
    const next = graph.get(edge.from) ?? [];
    next.push(edge.to);
    graph.set(edge.from, next);
  }
  const queue: string[] = [start];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);
    for (const target of graph.get(nodeId) ?? []) {
      if (!visited.has(target)) {
        queue.push(target);
      }
    }
  }
  return visited;
}

export function migrateSchema(schema: FormSchema): FormSchema {
  const edges = normalizeEdges(schema);
  const nodes = (schema.nodes ?? []).map((node, index) => {
    const resolved = resolveNodeTypeLenient(node);
    const normalized = normalizedNodeType(node);
    const base =
      resolved && resolved !== normalized ? ({ ...node, type: resolved } as FormNode) : node;
    return {
      ...base,
      position:
        base.position ??
        ({
          x: 60 + (index % 4) * 220,
          y: 50 + Math.floor(index / 4) * 130
        } as const)
    };
  });
  const metadata = schema.metadata
    ? (() => {
        const base = {
          ...schema.metadata,
          requirements: schema.metadata.requirements ?? [],
          documents: schema.metadata.documents ?? [],
          stages: schema.metadata.stages ?? []
        };
        const existing = (base.visitorBriefing ?? "").trim();
        if (existing.length > 0) {
          return base;
        }
        const legacyParts = [base.description, base.summary]
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0);
        if (legacyParts.length === 0) {
          return base;
        }
        return { ...base, visitorBriefing: legacyParts.join("\n\n") };
      })()
    : undefined;

  return {
    ...schema,
    schemaVersion: schema.schemaVersion ?? 1,
    edges,
    nodes,
    metadata
  };
}
