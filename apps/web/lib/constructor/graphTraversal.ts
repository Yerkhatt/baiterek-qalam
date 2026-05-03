import type { FormEdge, FormField, FormNode, FormSchema } from "@qalam/form-engine";

/**
 * Walks incoming edges from `targetNodeId` and collects fields from upstream `step` nodes.
 * De-duplicates by `field.id` (first occurrence wins along the traversal).
 * Uses a visited set on node ids to tolerate cycles in the graph.
 */
export function getUpstreamFields(targetNodeId: string, schema: FormSchema): FormField[] {
  const visited = new Set<string>();
  const fields: FormField[] = [];
  const seenFieldIds = new Set<string>();

  function traverseBackwards(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const incomingEdges = (schema.edges ?? []).filter((e: FormEdge) => e.to === nodeId);
    for (const edge of incomingEdges) {
      const parentNode = schema.nodes.find((n: FormNode) => n.id === edge.from);
      if (!parentNode) continue;

      if (parentNode.type === "step" && parentNode.fields?.length) {
        for (const f of parentNode.fields) {
          if (seenFieldIds.has(f.id)) continue;
          seenFieldIds.add(f.id);
          fields.push(f);
        }
      }
      traverseBackwards(parentNode.id);
    }
  }

  traverseBackwards(targetNodeId);
  return fields;
}

export type UpstreamFieldOption = {
  field: FormField;
  sourceNode: FormNode;
};

/**
 * Same traversal as {@link getUpstreamFields}, but keeps the originating step node for labels.
 */
export function getUpstreamFieldRefs(targetNodeId: string, schema: FormSchema): UpstreamFieldOption[] {
  const visited = new Set<string>();
  const refs: UpstreamFieldOption[] = [];
  const seenFieldIds = new Set<string>();
  const byId = new Map(schema.nodes.map((n) => [n.id, n]));

  function traverseBackwards(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const incomingEdges = (schema.edges ?? []).filter((e: FormEdge) => e.to === nodeId);
    for (const edge of incomingEdges) {
      const parentNode = byId.get(edge.from);
      if (!parentNode) continue;

      if (parentNode.type === "step" && parentNode.fields?.length) {
        for (const f of parentNode.fields) {
          if (seenFieldIds.has(f.id)) continue;
          seenFieldIds.add(f.id);
          refs.push({ field: f, sourceNode: parentNode });
        }
      }
      traverseBackwards(parentNode.id);
    }
  }

  traverseBackwards(targetNodeId);
  return refs;
}
