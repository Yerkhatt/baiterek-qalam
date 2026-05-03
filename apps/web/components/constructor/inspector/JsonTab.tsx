"use client";

import { useEffect, useRef, useState } from "react";
import type { FormNode } from "@qalam/form-engine";

interface Props {
  node: FormNode;
  onUpdate: (updates: Partial<FormNode>) => void;
  /** Hide section heading when wrapped in a collapsible panel */
  embedded?: boolean;
}

export function JsonTab({ node, onUpdate, embedded }: Props) {
  const [raw, setRaw] = useState(() => JSON.stringify(node, null, 2));
  const [error, setError] = useState<string | null>(null);
  const lastNodeId = useRef(node.id);

  useEffect(() => {
    if (node.id !== lastNodeId.current) {
      setRaw(JSON.stringify(node, null, 2));
      setError(null);
      lastNodeId.current = node.id;
    }
  }, [node]);

  function apply() {
    try {
      const parsed = JSON.parse(raw) as FormNode;
      if (!parsed.id || !parsed.type) {
        setError("Узел должен содержать поля id и type.");
        return;
      }
      setError(null);
      onUpdate(parsed);
    } catch (e) {
      setError("Ошибка разбора JSON: " + String(e));
    }
  }

  return (
    <div className="insp-section-list">
      <div className="insp-section">
        {!embedded ? <div className="insp-section-title">JSON узла</div> : null}
        <textarea
          className="insp-textarea insp-textarea--code insp-textarea--full"
          rows={20}
          value={raw}
          spellCheck={false}
          onChange={(e) => setRaw(e.target.value)}
        />
        {error && <div className="insp-error">{error}</div>}
        <button type="button" className="insp-btn-primary" onClick={apply}>
          Применить JSON
        </button>
      </div>
    </div>
  );
}
