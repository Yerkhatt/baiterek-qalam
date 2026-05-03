"use client";

import { useState } from "react";
import type { FormNode, Rule, RuleAction } from "@qalam/form-engine";

const ACTION_TYPES = [
  { value: "set_value", label: "Установить значение" },
  { value: "set_visible", label: "Видимость" },
  { value: "set_required", label: "Обязательность" },
  { value: "set_error", label: "Ошибка валидации" },
  { value: "emit_event", label: "Событие" },
  { value: "goto", label: "Перейти к узлу" }
] as const;

interface Props {
  node: FormNode;
  onUpdate: (updates: Partial<FormNode>) => void;
}

export function RulesTab({ node, onUpdate }: Props) {
  const [newId, setNewId] = useState("");
  const [whenRaw, setWhenRaw] = useState("true");
  const [actionType, setActionType] = useState<RuleAction["type"]>("set_visible");
  const [actionPath, setActionPath] = useState("");
  const [actionValue, setActionValue] = useState("true");
  const [eventName, setEventName] = useState("");

  const rules: Rule[] = node.rules ?? [];

  function addRule() {
    if (!newId.trim()) return;

    let when: unknown = true;
    try { when = JSON.parse(whenRaw); } catch { when = whenRaw; }

    let action: RuleAction;
    try {
      const val: unknown = JSON.parse(actionValue);
      switch (actionType) {
        case "set_visible":
          action = { type: "set_visible", path: actionPath, value: Boolean(val) };
          break;
        case "set_required":
          action = { type: "set_required", path: actionPath, value: Boolean(val) };
          break;
        case "set_error":
          action = { type: "set_error", path: actionPath, messageKey: String(val) };
          break;
        case "emit_event":
          action = { type: "emit_event", name: eventName || actionPath || "form.event", payload: val };
          break;
        case "goto":
          action = { type: "goto", nodeId: actionPath || String(val) };
          break;
        default:
          action = { type: "set_value", path: actionPath, value: val };
      }
    } catch {
      action = { type: "set_visible", path: actionPath, value: true };
    }

    const rule: Rule = { id: newId.trim(), when, then: [action] };
    onUpdate({ rules: [...rules, rule] });
    setNewId("");
    setWhenRaw("true");
    setActionPath("");
    setActionValue("true");
    setEventName("");
  }

  function removeRule(id: string) {
    onUpdate({ rules: rules.filter((r) => r.id !== id) });
  }

  function updateRule(ruleId: string, patch: Partial<Rule>) {
    onUpdate({
      rules: rules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule))
    });
  }

  return (
    <div className="insp-section-list">
      {rules.length === 0 && (
        <div className="insp-empty">Нет правил. Добавьте ниже.</div>
      )}

      {rules.map((rule) => (
        <div key={rule.id} className="insp-field-card">
          <div className="insp-field-card-head">
            <span className="insp-field-id">{rule.id}</span>
            <span className="insp-field-type-badge">{rule.then[0]?.type ?? "rule"}</span>
            <button
              type="button"
              className="insp-field-remove"
              aria-label="Удалить"
              onClick={() => removeRule(rule.id)}
            >
              ×
            </button>
          </div>
          <div className="insp-row">
            <span className="insp-label-sm" style={{ color: "#64748b" }}>
              when: {JSON.stringify(rule.when)}
            </span>
          </div>
          <div className="insp-row">
            <label className="insp-label">when JSONLogic</label>
            <textarea
              className="insp-textarea insp-textarea--code"
              rows={2}
              defaultValue={JSON.stringify(rule.when ?? true, null, 2)}
              onBlur={(event) => {
                try {
                  updateRule(rule.id, { when: JSON.parse(event.target.value) as unknown });
                } catch {
                  // ignore invalid json
                }
              }}
            />
          </div>
          <div className="insp-row">
            <label className="insp-label">Actions JSON</label>
            <textarea
              className="insp-textarea insp-textarea--code"
              rows={3}
              defaultValue={JSON.stringify(rule.then ?? [], null, 2)}
              onBlur={(event) => {
                try {
                  const next = JSON.parse(event.target.value) as RuleAction[];
                  if (Array.isArray(next)) {
                    updateRule(rule.id, { then: next });
                  }
                } catch {
                  // ignore invalid json
                }
              }}
            />
          </div>
        </div>
      ))}

      <div className="insp-section">
        <div className="insp-section-title">Добавить правило</div>
        <div className="insp-row">
          <label className="insp-label">ID правила</label>
          <input
            className="insp-input"
            value={newId}
            placeholder="show_if_leasing"
            onChange={(e) => setNewId(e.target.value)}
          />
        </div>
        <div className="insp-row">
          <label className="insp-label">Условие when (JSONLogic)</label>
          <textarea
            className="insp-textarea insp-textarea--code"
            rows={2}
            value={whenRaw}
            onChange={(e) => setWhenRaw(e.target.value)}
            placeholder={'{ "==": [{"var": "type"}, "example"] }'}
          />
        </div>
        <div className="insp-row insp-row--inline">
          <label className="insp-label">Действие</label>
          <select
            className="insp-select"
            value={actionType}
            onChange={(e) => setActionType(e.target.value as RuleAction["type"])}
          >
            {ACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="insp-row">
          <label className="insp-label">Path / NodeId</label>
          <input
            className="insp-input"
            value={actionPath}
            placeholder="field_id или node_id"
            onChange={(e) => setActionPath(e.target.value)}
          />
        </div>
        {actionType === "emit_event" ? (
          <div className="insp-row">
            <label className="insp-label">Event name</label>
            <input
              className="insp-input"
              value={eventName}
              placeholder="application.updated"
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>
        ) : null}
        <div className="insp-row">
          <label className="insp-label">
            {actionType === "set_error" ? "Message key" : "Значение (JSON)"}
          </label>
          <input
            className="insp-input"
            value={actionValue}
            placeholder="true / false / &quot;value&quot;"
            onChange={(e) => setActionValue(e.target.value)}
          />
        </div>
        <button type="button" className="insp-btn-primary" onClick={addRule}>
          + Добавить правило
        </button>
      </div>
    </div>
  );
}
