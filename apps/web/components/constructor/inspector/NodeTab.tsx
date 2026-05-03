"use client";

import type { FormNode, FormSchema } from "@qalam/form-engine";
import { getConstructorNodeTitle, getEditorTitleValue } from "@/lib/constructor/nodeLabels";
import { NODE_TYPE_ACCENT, NodeIcon } from "../NodeIcon";

interface Props {
  node: FormNode;
  schema: FormSchema;
  onUpdate: (updates: Partial<FormNode>) => void;
  onSchemaUpdate: (updater: (prev: FormSchema) => FormSchema) => void;
  /** Full-width title only — dialog header already shows the node type icon */
  compactTitle?: boolean;
}

/** Returns nodes that point to this node (parents) */
function getIncoming(node: FormNode, schema: FormSchema): Array<{ from: FormNode; toPort?: string }> {
  const byId = new Map(schema.nodes.map((item) => [item.id, item]));
  return (schema.edges ?? [])
    .filter((edge) => edge.to === node.id)
    .flatMap((edge) => {
      const from = byId.get(edge.from);
      return from ? [{ from, toPort: edge.toPort }] : [];
    });
}

/** Returns nodes this node points to (children) */
function getOutgoing(node: FormNode, schema: FormSchema): Array<{ to: FormNode; fromPort?: string }> {
  const byId = new Map(schema.nodes.map((item) => [item.id, item]));
  return (schema.edges ?? [])
    .filter((edge) => edge.from === node.id)
    .flatMap((edge) => {
      const to = byId.get(edge.to);
      return to ? [{ to, fromPort: edge.fromPort }] : [];
    });
}

export function NodeTab({ node, schema, onUpdate, onSchemaUpdate, compactTitle }: Props) {
  const incoming = getIncoming(node, schema);
  const outgoing = getOutgoing(node, schema);
  const edges = schema.edges ?? [];
  const outgoingEdges = edges.filter((edge) => edge.from === node.id);
  const showTransitionConditions =
    outgoingEdges.length > 0 && node.type !== "step" && node.type !== "switch";
  const hasLinks = incoming.length > 0 || outgoing.length > 0 || showTransitionConditions;

  function commitTitleTrimmed(raw: string) {
    const trimmed = raw.trim();
    onUpdate({ title_key: trimmed ? trimmed : undefined });
  }

  function updateEdgeCondition(edgeId: string, raw: string) {
    onSchemaUpdate((prev) => ({
      ...prev,
      edges: (prev.edges ?? []).map((edge) => {
        if (edge.id !== edgeId) {
          return edge;
        }
        if (!raw.trim()) {
          const { condition, ...rest } = edge;
          return rest;
        }
        try {
          return { ...edge, condition: JSON.parse(raw) as unknown };
        } catch {
          return edge;
        }
      })
    }));
  }

  function updateEdgePriority(edgeId: string, value: string) {
    onSchemaUpdate((prev) => ({
      ...prev,
      edges: (prev.edges ?? []).map((edge) => {
        if (edge.id !== edgeId) {
          return edge;
        }
        if (!value.trim()) {
          const { priority, ...rest } = edge;
          return rest;
        }
        return { ...edge, priority: Number(value) };
      })
    }));
  }

  function updateEdgeLabel(edgeId: string, value: string) {
    onSchemaUpdate((prev) => ({
      ...prev,
      edges: (prev.edges ?? []).map((edge) => {
        if (edge.id !== edgeId) {
          return edge;
        }
        if (!value.trim()) {
          const { label_key, ...rest } = edge;
          return rest;
        }
        return { ...edge, label_key: value.trim() };
      })
    }));
  }

  return (
    <div className="insp-section-list">
      <div className="insp-section insp-section--gf-head">
        {compactTitle ? (
          <textarea
            className="insp-gf-title insp-gf-title--full"
            id="cinsp-node-title"
            rows={2}
            aria-label="Заголовок"
            placeholder="Заголовок"
            value={getEditorTitleValue(node)}
            onChange={(e) => onUpdate({ title_key: e.target.value.length ? e.target.value : undefined })}
            onBlur={(e) => commitTitleTrimmed(e.target.value)}
          />
        ) : (
          <div className="insp-gf-head-row">
            <span
              className="insp-gf-type-icon"
              style={{ background: NODE_TYPE_ACCENT[node.type as keyof typeof NODE_TYPE_ACCENT] ?? "#64748b" }}
              aria-hidden
            >
              <NodeIcon type={node.type} size={14} />
            </span>
            <textarea
              className="insp-gf-title"
              id="cinsp-node-title"
              rows={2}
              aria-label="Заголовок"
              placeholder="Заголовок"
              value={getEditorTitleValue(node)}
              onChange={(e) => onUpdate({ title_key: e.target.value.length ? e.target.value : undefined })}
              onBlur={(e) => commitTitleTrimmed(e.target.value)}
            />
          </div>
        )}
      </div>

      {hasLinks ? (
        <div className="insp-section">
          <div className="insp-section-title">Связи</div>

          {incoming.length > 0 && (
            <div className="insp-row">
              <label className="insp-label">Откуда</label>
              <div className="insp-conn-list">
                {incoming.map((n) => (
                  <span
                    key={`${n.from.id}_${n.toPort ?? "in"}`}
                    className="insp-conn-chip insp-conn-chip--in"
                  >
                    <span
                      className="insp-conn-dot"
                      style={{
                        background: NODE_TYPE_ACCENT[n.from.type as keyof typeof NODE_TYPE_ACCENT] ?? "#64748b"
                      }}
                    />
                    <span className="insp-conn-name">{getConstructorNodeTitle(n.from)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {outgoing.length > 0 && (
            <div className="insp-row">
              <label className="insp-label">Куда</label>
              <div className="insp-conn-list">
                {outgoing.map((target) => (
                  <span
                    key={`${target.to.id}_${target.fromPort ?? "main"}`}
                    className="insp-conn-chip insp-conn-chip--out"
                  >
                    <span className="insp-conn-dot" style={{ background: "#4f46e5" }} />
                    <span className="insp-conn-name">{getConstructorNodeTitle(target.to)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {showTransitionConditions ? (
            <div className="insp-row">
              <label className="insp-label">Условия переходов</label>
              <div className="stack">
                {outgoingEdges.map((edge) => (
                  <div key={edge.id} className="insp-field-card">
                    <div className="insp-row insp-row--inline">
                      <span className="insp-label-sm">
                        {edge.fromPort ?? "main"} → {edge.to}
                      </span>
                      <input
                        className="insp-input insp-input--sm"
                        style={{ width: 84 }}
                        placeholder="priority"
                        defaultValue={edge.priority ?? ""}
                        onBlur={(event) => updateEdgePriority(edge.id, event.target.value)}
                      />
                    </div>
                    <div className="insp-row">
                      <label className="insp-label">Label key</label>
                      <input
                        className="insp-input insp-input--sm"
                        defaultValue={edge.label_key ?? ""}
                        onBlur={(event) => updateEdgeLabel(edge.id, event.target.value)}
                      />
                    </div>
                    <div className="insp-row">
                      <label className="insp-label">Condition JSONLogic</label>
                      <textarea
                        className="insp-textarea insp-textarea--code"
                        rows={3}
                        defaultValue={edge.condition ? JSON.stringify(edge.condition, null, 2) : ""}
                        onBlur={(event) => updateEdgeCondition(edge.id, event.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
