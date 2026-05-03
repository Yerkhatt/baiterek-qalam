"use client";

import { memo, useState } from "react";
import { Handle, NodeToolbar, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import type { FormNode } from "@qalam/form-engine";
import { NODE_TYPE_ACCENT, NodeIcon } from "./NodeIcon";
import { getNodeDefinition, getNodeOutputs } from "@/lib/form-builder/nodeTypeRegistry";
import { estimateConstructorNodeCardHeight } from "@/lib/form-builder/graph";
import { getConstructorNodeTitle } from "@/lib/constructor/nodeLabels";

interface NodeData {
  formNode: FormNode;
  issueCount?: number;
}

export const ConstructorNodeCard = memo(function ConstructorNodeCard({
  id,
  data,
  selected
}: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const { deleteElements } = useReactFlow();

  const nodeData = data as unknown as NodeData;
  const node = nodeData.formNode;
  const definition = getNodeDefinition(node.type);
  const outputs = getNodeOutputs(node);
  const cardHeightPx = estimateConstructorNodeCardHeight(node);
  const accent = NODE_TYPE_ACCENT[node.type as keyof typeof NODE_TYPE_ACCENT] ?? "#64748b";
  const displayTitle = getConstructorNodeTitle(node);
  const fieldCount = node.fields?.length ?? 0;
  const docCount = node.documents?.length ?? 0;
  const issueCount = nodeData.issueCount ?? 0;

  const showToolbar = hovered || selected;

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    void deleteElements({ nodes: [{ id }] });
  }

  return (
    <>
      {/* Floating action toolbar — visible on hover (n8n pattern) */}
      <NodeToolbar isVisible={showToolbar} position={Position.Top} className="cnode-toolbar">
        <div className="cnode-tb-items">
          <button
            type="button"
            className="cnode-tb-btn cnode-tb-btn--danger"
            onClick={handleDelete}
            title="Удалить узел"
          >
            {/* trash icon */}
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M6 4V2h4v2M5 4l1 9h4l1-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </NodeToolbar>

      {/* Node card — square, icon-centered like n8n */}
      <div
        className={["cnode", selected ? "is-selected" : ""].filter(Boolean).join(" ")}
        data-type={node.type}
        style={
          {
            "--node-accent": accent,
            height: cardHeightPx,
            minHeight: cardHeightPx
          } as React.CSSProperties
        }
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {definition.inputs.map((input, index) => {
          const total = Math.max(1, definition.inputs.length);
          const top = `${((index + 1) / (total + 1)) * 100}%`;
          return (
            <Handle
              key={input.id}
              id={input.id}
              type="target"
              position={Position.Left}
              className="cnode-rf-handle cnode-rf-handle--in"
              style={{ top }}
            />
          );
        })}

        {/* Centered icon box */}
        <div className="cnode-icon-wrap">
          <NodeIcon type={node.type} size={26} />
        </div>

        {/* Small chips inside card (field/doc count) */}
        {(fieldCount > 0 || docCount > 0) && (
          <div className="cnode-badges">
            {fieldCount > 0 && (
              <span className="cnode-badge">{fieldCount}п</span>
            )}
            {docCount > 0 && (
              <span className="cnode-badge cnode-badge--doc">{docCount}д</span>
            )}
          </div>
        )}

        {outputs.map((output, index) => {
          const total = Math.max(1, outputs.length);
          const top = `${((index + 1) / (total + 1)) * 100}%`;
          return (
            <div key={output.id}>
              <Handle
                id={output.id}
                type="source"
                position={Position.Right}
                className="cnode-rf-handle cnode-rf-handle--out"
                style={{ top }}
              />
              {output.label && output.label !== "main" ? (
                <div className="cnode-port-label cnode-port-label--out" style={{ top }}>
                  {output.label}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Label below card — human-readable only */}
      <div className="cnode-meta">
        <div className="cnode-meta-title">
          {displayTitle}
          {issueCount > 0 ? (
            <span className="cnode-issue-badge cnode-issue-badge--warn" title="Замечания проверки графа">
              ⚠ {issueCount}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
});
