"use client";

import { useEffect, useRef } from "react";
import { NodeIcon, NODE_TYPE_ACCENT, NODE_TYPE_DESCRIPTION, NODE_TYPE_LABEL, NodeTypeName } from "./NodeIcon";

const ALL_TYPES: NodeTypeName[] = [
  "start",
  "step",
  "branch",
  "switch",
  "validation_gate",
  "calculation",
  "document_request",
  "integration_call",
  "sign",
  "approval",
  "end"
];

interface Props {
  x: number;
  y: number;
  onAddNode: (type: NodeTypeName) => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, onAddNode, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Keep menu inside viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(x, window.innerWidth - 260),
    top: Math.min(y, window.innerHeight - 420),
    zIndex: 9000
  };

  return (
    <div ref={ref} className="ctx-menu" style={style} role="menu" aria-label="Добавить узел">
      <div className="ctx-menu-header">Добавить узел</div>
      {ALL_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className="ctx-menu-item"
          role="menuitem"
          onClick={() => {
            onAddNode(type);
            onClose();
          }}
        >
          <span
            className="ctx-menu-item-icon"
            style={{ background: NODE_TYPE_ACCENT[type] }}
          >
            <NodeIcon type={type} size={14} />
          </span>
          <span className="ctx-menu-item-body">
            <span className="ctx-menu-item-label">{NODE_TYPE_LABEL[type]}</span>
            <span className="ctx-menu-item-desc">{NODE_TYPE_DESCRIPTION[type]}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
