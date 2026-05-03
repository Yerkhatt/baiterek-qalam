"use client";

import type { FormField, FormNode, FormSchema, SwitchConfig, SwitchRoute, SwitchRouteValue } from "@qalam/form-engine";
import { getUpstreamFieldRefs } from "@/lib/constructor/graphTraversal";
import { getConstructorNodeTitle } from "@/lib/constructor/nodeLabels";
import { createSwitchRouteId, deriveSwitchRoutesFromField, resolvedOptionsForField } from "@/lib/form-builder/fieldOptions";
import { SWITCH_EXTRA_OUTPUT_ID } from "@/lib/form-builder/nodeTypeRegistry";

interface Props {
  node: FormNode;
  schema: FormSchema;
  onUpdate: (updates: Partial<FormNode>) => void;
}

function ensureSwitchConfig(node: FormNode): SwitchConfig {
  return (
    node.switch ?? {
      mode: "rules",
      routes: [],
      fallback: { mode: "none" },
      allMatchingOutputs: false
    }
  );
}

function toRouteValue(raw: string): SwitchRouteValue {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const parsedNumber = Number(trimmed);
  if (trimmed !== "" && Number.isFinite(parsedNumber) && `${parsedNumber}` === trimmed) {
    return parsedNumber;
  }
  return raw;
}

function asEditableText(value: SwitchRouteValue): string {
  return typeof value === "string" ? value : String(value);
}

function fieldHasChoiceOptions(field: FormField, schema: FormSchema): boolean {
  if (field.type !== "select" && field.type !== "radio") {
    return false;
  }
  return resolvedOptionsForField(field, schema).length > 0;
}

export function SwitchConfigTab({ node, schema, onUpdate }: Props) {
  const cfg = ensureSwitchConfig(node);
  const upstreamRefs = getUpstreamFieldRefs(node.id, schema);

  const updateSwitch = (patch: Partial<SwitchConfig>) => {
    onUpdate({
      switch: {
        ...cfg,
        ...patch
      }
    });
  };

  const selectedRef = upstreamRefs.find((r) => r.field.id === cfg.sourceFieldId);
  const sourceFieldMissing = cfg.mode === "rules" && !cfg.sourceFieldId?.trim();
  const sourceFieldInvalid = cfg.mode === "rules" && Boolean(cfg.sourceFieldId?.trim()) && !selectedRef;
  const sourceFieldNeedsAttention = sourceFieldMissing || sourceFieldInvalid;

  const updateRoute = (routeId: string, patch: Partial<SwitchRoute>) => {
    updateSwitch({
      routes: (cfg.routes ?? []).map((route) => (route.id === routeId ? { ...route, ...patch } : route))
    });
  };

  const removeRoute = (routeId: string) => {
    updateSwitch({
      routes: (cfg.routes ?? []).filter((route) => route.id !== routeId),
      fallback:
        cfg.fallback?.mode === "existing" && cfg.fallback.routeId === routeId
          ? { mode: "none" }
          : cfg.fallback
    });
  };

  const onPickSourceField = (sourceFieldId: string | undefined) => {
    if (!sourceFieldId) {
      updateSwitch({ sourceFieldId: undefined });
      return;
    }
    const ref = upstreamRefs.find((r) => r.field.id === sourceFieldId);
    const nextRoutes =
      ref && fieldHasChoiceOptions(ref.field, schema)
        ? deriveSwitchRoutesFromField(ref.field, schema, cfg.routes ?? [])
        : cfg.routes?.length
          ? cfg.routes
          : [];
    updateSwitch({
      sourceFieldId,
      routes: nextRoutes.length > 0 ? nextRoutes : cfg.routes ?? []
    });
  };

  const syncRoutesFromField = () => {
    if (!selectedRef) return;
    const routes = deriveSwitchRoutesFromField(selectedRef.field, schema, cfg.routes ?? []);
    if (routes.length === 0) return;
    updateSwitch({ routes });
  };

  return (
    <div className="insp-section-list">
      {sourceFieldNeedsAttention ? (
        <div className="insp-error-banner">
          <div className="insp-error-banner__title">Switch не готов к публикации</div>
          <div className="insp-error-banner__text">
            {sourceFieldMissing
              ? "Выберите поле-источник для маршрутизации."
              : "Выбранное поле-источник больше не найдено. Выберите поле заново."}
          </div>
          {upstreamRefs.length > 0 ? (
            <div className="insp-error-banner__actions">
              {upstreamRefs.slice(0, 4).map((ref) => (
                <button
                  key={`${ref.sourceNode.id}_${ref.field.id}`}
                  type="button"
                  className="insp-btn-primary"
                  onClick={() => onPickSourceField(ref.field.id)}
                >
                  Использовать: {ref.field.label_key?.trim() || ref.field.id}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {cfg.mode === "rules" ? (
        <div className="insp-section">
          <div className="insp-section-title">Маршрутизация</div>
          <p className="insp-hint-sm" style={{ marginBottom: 10 }}>
            Выберите вопрос из уже подключённых к этому узлу шагов формы. Для списка или переключателя ветки создаются
            автоматически по вариантам ответа.
          </p>

          <div className="insp-row">
            <label className="insp-label" htmlFor={`sw-src-${node.id}`}>
              Вопрос для разветвления
            </label>
            <select
              id={`sw-src-${node.id}`}
              className="insp-select"
              value={cfg.sourceFieldId ?? ""}
              onChange={(e) => onPickSourceField(e.target.value || undefined)}
            >
              <option value="">Выберите поле…</option>
              {upstreamRefs.map((ref) => (
                <option key={`${ref.sourceNode.id}_${ref.field.id}`} value={ref.field.id}>
                  {getConstructorNodeTitle(ref.sourceNode)} — {ref.field.label_key ?? ref.field.id}
                </option>
              ))}
            </select>
          </div>

          {upstreamRefs.length === 0 ? (
            <p className="insp-hint-sm">Подключите к этому узлу хотя бы один шаг формы слева на холсте.</p>
          ) : null}

          {selectedRef && fieldHasChoiceOptions(selectedRef.field, schema) ? (
            <div className="insp-row">
              <button type="button" className="insp-btn-primary" onClick={syncRoutesFromField}>
                Обновить ветки по вариантам поля
              </button>
            </div>
          ) : selectedRef ? (
            <p className="insp-hint-sm">
              У выбранного поля нет фиксированных вариантов — задайте ветки вручную ниже или смените тип поля на
              «Список» / «Переключатель» с вариантами.
            </p>
          ) : null}
        </div>
      ) : null}

      {cfg.mode === "rules" && (
        <div className="insp-section">
          <div className="insp-section-title">Ветки (выходы)</div>
          {(cfg.routes ?? []).map((route, index) => (
            <div key={route.id} className="insp-field-card">
              <div className="insp-field-card-head">
                <span className="insp-field-id">Выход {index + 1}</span>
                <button
                  type="button"
                  className="insp-field-remove"
                  aria-label="Удалить ветку"
                  onClick={() => removeRoute(route.id)}
                >
                  ×
                </button>
              </div>
              <div className="insp-row">
                <label className="insp-label">Подпись на схеме</label>
                <input
                  className="insp-input insp-input--sm"
                  value={route.label ?? ""}
                  onChange={(e) => updateRoute(route.id, { label: e.target.value || undefined })}
                  placeholder={`Ветка ${index + 1}`}
                />
              </div>
              <div className="insp-row">
                <label className="insp-label">Значение для сравнения</label>
                <input
                  className="insp-input insp-input--sm"
                  value={asEditableText(route.value)}
                  onChange={(e) => updateRoute(route.id, { value: toRouteValue(e.target.value) })}
                  placeholder="как в поле формы"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="insp-btn-primary"
            onClick={() =>
              updateSwitch({
                routes: [
                  ...(cfg.routes ?? []),
                  {
                    id: createSwitchRouteId(cfg.routes?.length ?? 0),
                    value: `branch_${(cfg.routes?.length ?? 0) + 1}`,
                    label: `Ветка ${(cfg.routes?.length ?? 0) + 1}`
                  }
                ]
              })
            }
          >
            Добавить ветку
          </button>
        </div>
      )}

      <details className="cinsp-details">
        <summary>Расширенные настройки</summary>
        <div className="insp-section" style={{ marginTop: 8 }}>
          <div className="insp-row">
            <label className="insp-label">Режим</label>
            <select
              className="insp-select"
              value={cfg.mode}
              onChange={(e) => {
                const mode = e.target.value as SwitchConfig["mode"];
                updateSwitch({
                  mode,
                  routes:
                    mode === "expression"
                      ? cfg.routes
                      : cfg.routes?.length
                        ? cfg.routes
                        : [{ id: createSwitchRouteId(0), value: "a", label: "A" }]
                });
              }}
            >
              <option value="rules">По значению поля</option>
              <option value="expression">По выражению (JSONLogic)</option>
            </select>
          </div>

          {cfg.mode === "expression" && (
            <>
              <div className="insp-row">
                <label className="insp-label">Число выходов</label>
                <input
                  className="insp-input"
                  type="number"
                  min={1}
                  value={cfg.numberOutputs ?? 2}
                  onChange={(e) => updateSwitch({ numberOutputs: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              <div className="insp-row">
                <label className="insp-label">Индекс выхода (JSONLogic)</label>
                <textarea
                  className="insp-textarea insp-textarea--code"
                  rows={4}
                  defaultValue={JSON.stringify(cfg.expression ?? { var: "values.example" }, null, 2)}
                  onBlur={(e) => {
                    try {
                      updateSwitch({ expression: JSON.parse(e.target.value) as unknown });
                    } catch {
                      updateSwitch({ expression: e.target.value });
                    }
                  }}
                />
              </div>
            </>
          )}

          <div className="insp-row">
            <label className="insp-label">Если ни одна ветка не подошла</label>
            <select
              className="insp-select"
              value={cfg.fallback?.mode ?? "none"}
              onChange={(e) => {
                const value = e.target.value as "none" | "extra" | "existing";
                if (value === "none") {
                  updateSwitch({ fallback: { mode: "none" } });
                  return;
                }
                if (value === "extra") {
                  updateSwitch({ fallback: { mode: "extra", label: "Прочее" } });
                  return;
                }
                const firstRouteId = cfg.routes?.[0]?.id;
                updateSwitch({ fallback: firstRouteId ? { mode: "existing", routeId: firstRouteId } : { mode: "none" } });
              }}
            >
              <option value="none">Остановить (нет перехода)</option>
              <option value="extra">Дополнительный выход «Прочее»</option>
              <option value="existing">Направить в существующую ветку</option>
            </select>
          </div>
          {cfg.fallback?.mode === "existing" && (
            <div className="insp-row">
              <label className="insp-label">Ветка по умолчанию</label>
              <select
                className="insp-select"
                value={cfg.fallback.routeId}
                onChange={(e) => updateSwitch({ fallback: { mode: "existing", routeId: e.target.value } })}
              >
                {(cfg.routes ?? []).map((route, index) => (
                  <option key={route.id} value={route.id}>
                    Выход {index + 1}
                  </option>
                ))}
              </select>
            </div>
          )}
          {cfg.fallback?.mode === "extra" && (
            <div className="insp-row">
              <label className="insp-label">Подпись «Прочее»</label>
              <input
                className="insp-input insp-input--sm"
                value={cfg.fallback.label ?? "Прочее"}
                onChange={(e) => updateSwitch({ fallback: { mode: "extra", label: e.target.value } })}
              />
              <div className="insp-hint-sm">Технический идентификатор порта: {SWITCH_EXTRA_OUTPUT_ID}</div>
            </div>
          )}

          {cfg.mode === "rules" && (
            <label className="insp-checkbox-label">
              <input
                type="checkbox"
                checked={Boolean(cfg.allMatchingOutputs)}
                onChange={(e) => updateSwitch({ allMatchingOutputs: e.target.checked })}
              />
              Разрешить несколько совпадений одновременно
            </label>
          )}
        </div>
      </details>
    </div>
  );
}
