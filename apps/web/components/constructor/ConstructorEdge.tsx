"use client";

import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps
} from "@xyflow/react";

/**
 * Custom edge component:
 * – Bézier path (n8n-like curves, not orthogonal)
 * – Wide transparent hit-area so the edge is easy to hover
 * – Shows a × delete button at the midpoint when hovered or selected
 * – Calls React Flow's deleteElements() which triggers onEdgesDelete → schema sync
 */
export const ConstructorEdge = memo(function ConstructorEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { deleteElements } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const isActive = hovered || selected;

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    void deleteElements({ edges: [{ id }] });
  }

  return (
    <>
      {/* Wide invisible hit-area so hover triggers easily */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#4f46e5" : hovered ? "#6366f1" : "#94a3b8",
          strokeWidth: isActive ? 2.5 : 2,
          transition: "stroke 150ms, stroke-width 150ms"
        }}
      />

      <EdgeLabelRenderer>
        {label ? (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${sourceX + 36}px, ${sourceY - 11}px)`,
              pointerEvents: "none",
              zIndex: 5
            }}
            className="cedge-label"
          >
            {String(label)}
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            zIndex: 10
          }}
          className="nodrag nopan"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {isActive && (
            <button
              type="button"
              className="cedge-delete-btn"
              onClick={handleDelete}
              title="Удалить связь (Delete)"
              aria-label="Удалить связь"
            >
              ×
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
