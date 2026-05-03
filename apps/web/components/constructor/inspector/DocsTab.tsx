"use client";

import { useState } from "react";
import type { DocumentRequest, FormNode } from "@qalam/form-engine";

interface Props {
  node: FormNode;
  onUpdate: (updates: Partial<FormNode>) => void;
}

export function DocsTab({ node, onUpdate }: Props) {
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newRequired, setNewRequired] = useState(true);
  const [newMaxMb, setNewMaxMb] = useState(20);
  const [newMaxCount, setNewMaxCount] = useState(1);
  const [newTypes, setNewTypes] = useState("application/pdf");
  const [newConditions, setNewConditions] = useState("");

  const docs = node.documents ?? [];

  function parseTypes(value: string): string[] | undefined {
    const parts = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return parts.length ? parts : undefined;
  }

  function addDoc() {
    if (!newId.trim()) return;
    const doc: DocumentRequest = {
      id: newId.trim(),
      label_key: newLabel.trim() || newId.trim(),
      required: newRequired,
      file_types: parseTypes(newTypes),
      max_size_mb: newMaxMb,
      max_count: newMaxCount || undefined,
      conditions: (() => {
        const raw = newConditions.trim();
        if (!raw) {
          return undefined;
        }
        try {
          return JSON.parse(raw) as unknown;
        } catch {
          return undefined;
        }
      })()
    };
    onUpdate({ documents: [...docs, doc] });
    setNewId("");
    setNewLabel("");
    setNewRequired(true);
    setNewMaxMb(20);
    setNewMaxCount(1);
    setNewTypes("application/pdf");
    setNewConditions("");
  }

  function removeDoc(id: string) {
    onUpdate({ documents: docs.filter((d) => d.id !== id) });
  }

  function updateDoc(id: string, patch: Partial<DocumentRequest>) {
    onUpdate({
      documents: docs.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc))
    });
  }

  return (
    <div className="insp-section-list">
      {docs.length === 0 && (
        <div className="insp-empty">Нет документов. Добавьте ниже.</div>
      )}

      {docs.map((doc) => (
        <div key={doc.id} className="insp-field-card">
          <div className="insp-field-card-head">
            <span className="insp-field-id">{doc.id}</span>
            {doc.required && <span className="insp-field-type-badge insp-field-type-badge--required">Обязательный</span>}
            <button
              type="button"
              className="insp-field-remove"
              aria-label="Удалить"
              onClick={() => removeDoc(doc.id)}
            >
              ×
            </button>
          </div>
          <div className="insp-row">
            <span className="insp-label-sm">{doc.label_key}</span>
            <span className="insp-label-sm" style={{ color: "#64748b" }}>
              max {doc.max_size_mb ?? 20} MB, count {doc.max_count ?? 1}
            </span>
          </div>
          <div className="insp-row">
            <label className="insp-label">Ключ метки</label>
            <input
              className="insp-input insp-input--sm"
              value={doc.label_key}
              onChange={(e) => updateDoc(doc.id, { label_key: e.target.value })}
            />
          </div>
          <div className="insp-row insp-row--inline">
            <label className="insp-label">Макс. MB</label>
            <input
              className="insp-input insp-input--sm"
              type="number"
              min={1}
              max={200}
              value={doc.max_size_mb ?? 20}
              onChange={(e) => updateDoc(doc.id, { max_size_mb: Number(e.target.value) })}
            />
            <label className="insp-label">Макс. файлов</label>
            <input
              className="insp-input insp-input--sm"
              type="number"
              min={1}
              max={20}
              value={doc.max_count ?? 1}
              onChange={(e) => updateDoc(doc.id, { max_count: Number(e.target.value) })}
            />
            <label className="insp-checkbox-label">
              <input
                type="checkbox"
                checked={Boolean(doc.required)}
                onChange={(e) => updateDoc(doc.id, { required: e.target.checked })}
              />
              Обязательный
            </label>
          </div>
          <div className="insp-row">
            <label className="insp-label">Типы MIME (через запятую)</label>
            <input
              className="insp-input insp-input--sm"
              defaultValue={(doc.file_types ?? []).join(",")}
              onBlur={(e) => updateDoc(doc.id, { file_types: parseTypes(e.target.value) })}
            />
          </div>
          <div className="insp-row">
            <label className="insp-label">Conditions JSONLogic</label>
            <textarea
              className="insp-textarea insp-textarea--code"
              rows={2}
              defaultValue={doc.conditions ? JSON.stringify(doc.conditions, null, 2) : ""}
              onBlur={(e) => {
                const raw = e.target.value.trim();
                if (!raw) {
                  updateDoc(doc.id, { conditions: undefined });
                  return;
                }
                try {
                  updateDoc(doc.id, { conditions: JSON.parse(raw) as unknown });
                } catch {
                  // ignore invalid json
                }
              }}
            />
          </div>
        </div>
      ))}

      <div className="insp-section">
        <div className="insp-section-title">Добавить документ</div>
        <div className="insp-row">
          <label className="insp-label">ID документа</label>
          <input
            className="insp-input"
            value={newId}
            placeholder="a020"
            onChange={(e) => setNewId(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addDoc(); }}
          />
        </div>
        <div className="insp-row">
          <label className="insp-label">Ключ метки</label>
          <input
            className="insp-input"
            value={newLabel}
            placeholder="docs.a020"
            onChange={(e) => setNewLabel(e.target.value)}
          />
        </div>
        <div className="insp-row insp-row--inline">
          <label className="insp-label">Макс. MB</label>
          <input
            className="insp-input insp-input--sm"
            type="number"
            value={newMaxMb}
            min={1}
            max={200}
            onChange={(e) => setNewMaxMb(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <label className="insp-label">Макс. файлов</label>
          <input
            className="insp-input insp-input--sm"
            type="number"
            value={newMaxCount}
            min={1}
            max={20}
            onChange={(e) => setNewMaxCount(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <label className="insp-checkbox-label">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
            />
            Обязательный
          </label>
        </div>
        <div className="insp-row">
          <label className="insp-label">Типы MIME (через запятую)</label>
          <input
            className="insp-input"
            value={newTypes}
            onChange={(e) => setNewTypes(e.target.value)}
            placeholder="application/pdf,image/png"
          />
        </div>
        <div className="insp-row">
          <label className="insp-label">Conditions JSONLogic</label>
          <textarea
            className="insp-textarea insp-textarea--code"
            rows={2}
            value={newConditions}
            onChange={(e) => setNewConditions(e.target.value)}
          />
        </div>
        <button type="button" className="insp-btn-primary" onClick={addDoc}>
          + Добавить документ
        </button>
      </div>
    </div>
  );
}
