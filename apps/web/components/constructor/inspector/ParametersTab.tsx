"use client";

import { useMemo } from "react";
import type { FormNode, FormSchema, IntegrationCall } from "@qalam/form-engine";
import { getUpstreamFieldRefs } from "@/lib/constructor/graphTraversal";
import { withSyncedEdges } from "@/lib/form-builder/graph";
import { DocsTab } from "./DocsTab";
import { FieldsTab } from "./FieldsTab";
import { SwitchConfigTab } from "./SwitchConfigTab";

interface BaseProps {
  node: FormNode;
  onUpdate: (updates: Partial<FormNode>) => void;
}

interface Props extends BaseProps {
  schema: FormSchema;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function defaultIntegration(nodeId: string): IntegrationCall {
  return { id: `${nodeId}_int`, adapter: "", payload_map: {} };
}

function GenericExecutionSection({ node, onUpdate }: BaseProps) {
  const execution = node.execution ?? {};
  return (
    <div className="insp-section">
      <div className="insp-section-title">Политика выполнения</div>
      <div className="insp-row insp-row--inline">
        <label className="insp-label">Timeout ms</label>
        <input
          className="insp-input insp-input--sm"
          type="number"
          min={0}
          value={execution.timeoutMs ?? ""}
          onChange={(e) =>
            onUpdate({
              execution: {
                ...execution,
                timeoutMs: e.target.value ? Number(e.target.value) : undefined
              }
            })
          }
        />
      </div>
      <div className="insp-row insp-row--inline">
        <label className="insp-label">Retry count</label>
        <input
          className="insp-input insp-input--sm"
          type="number"
          min={0}
          value={execution.retryCount ?? ""}
          onChange={(e) =>
            onUpdate({
              execution: {
                ...execution,
                retryCount: e.target.value ? Number(e.target.value) : undefined
              }
            })
          }
        />
      </div>
      <div className="insp-row insp-row--inline">
        <label className="insp-label">Retry delay ms</label>
        <input
          className="insp-input insp-input--sm"
          type="number"
          min={0}
          value={execution.retryDelayMs ?? ""}
          onChange={(e) =>
            onUpdate({
              execution: {
                ...execution,
                retryDelayMs: e.target.value ? Number(e.target.value) : undefined
              }
            })
          }
        />
      </div>
      <label className="insp-checkbox-label">
        <input
          type="checkbox"
          checked={Boolean(execution.continueOnError)}
          onChange={(e) =>
            onUpdate({
              execution: { ...execution, continueOnError: e.target.checked }
            })
          }
        />
        Продолжать при ошибке
      </label>
    </div>
  );
}

function mergePayloadMap(
  current: Record<string, unknown> | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return { ...(current ?? {}), ...patch };
}

function IntegrationParameters({ node, schema, onUpdate }: BaseProps & { schema: FormSchema }) {
  const base = node.integration ?? defaultIntegration(node.id);

  const upstreamRefs = useMemo(
    () => getUpstreamFieldRefs(node.id, withSyncedEdges(schema)),
    [node.id, schema]
  );

  const applyMockAcceptancePreset = () => {
    onUpdate({
      integration: {
        ...base,
        id: base.id || `${node.id}_erp`,
        adapter: "erp_mock_acceptance",
        method: "POST",
        url: "/api/erp/mock-leasing",
        payload_map: {
          submittedAt: { var: "now" },
          values: { var: "values" }
        },
        response_map: {
          referenceId: "erp.reference_id",
          acceptedAt: "erp.accepted_at"
        },
        continue_on_error: false
      }
    });
  };

  const applyMockSignPreset = () => {
    onUpdate({
      integration: {
        ...base,
        id: base.id || `${node.id}_sign`,
        adapter: "mock_sign_provider",
        method: "POST",
        url: "/api/erp/mock-sign",
        payload_map: {
          signedAt: { var: "now" },
          values: { var: "values" }
        },
        continue_on_error: false
      }
    });
  };

  return (
    <div className="insp-section-list">
      <div className="insp-section">
        <div className="insp-section-title">HTTPS-запрос</div>
        <div className="insp-row insp-row--inline" style={{ flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="insp-btn-primary" onClick={applyMockAcceptancePreset}>
            Шаблон: mock ERP
          </button>
          <button type="button" className="insp-btn-primary" onClick={applyMockSignPreset}>
            Шаблон: mock подпись
          </button>
        </div>
        {upstreamRefs.length > 0 ? (
          <div className="insp-row">
            <span className="insp-label">Быстрые поля в тело запроса</span>
            <div className="insp-row insp-row--inline" style={{ flexWrap: "wrap", gap: 6 }}>
              <button
                type="button"
                className="insp-btn-ghost"
                onClick={() =>
                  onUpdate({
                    integration: {
                      ...(node.integration ?? defaultIntegration(node.id)),
                      payload_map: mergePayloadMap(node.integration?.payload_map, {
                        values: { var: "values" }
                      })
                    }
                  })
                }
              >
                Все values
              </button>
              {upstreamRefs.map(({ field }) => (
                <button
                  key={field.id}
                  type="button"
                  className="insp-btn-ghost"
                  title={field.id}
                  onClick={() =>
                    onUpdate({
                      integration: {
                        ...(node.integration ?? defaultIntegration(node.id)),
                        payload_map: mergePayloadMap(node.integration?.payload_map, {
                          [field.id]: { var: `values.${field.id}` }
                        })
                      }
                    })
                  }
                >
                  {field.label_key?.trim() || field.id}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="insp-row">
          <label className="insp-label">Код адаптера</label>
          <input
            className="insp-input"
            value={node.integration?.adapter ?? ""}
            placeholder="например erp_mock_acceptance"
            onChange={(e) =>
              onUpdate({
                integration: {
                  ...(node.integration ?? defaultIntegration(node.id)),
                  adapter: e.target.value
                }
              })
            }
          />
        </div>
        <div className="insp-row">
          <label className="insp-label">Адрес (path)</label>
          <input
            className="insp-input"
            value={node.integration?.url ?? ""}
            placeholder="/api/erp/mock-leasing"
            onChange={(e) =>
              onUpdate({
                integration: {
                  ...(node.integration ?? defaultIntegration(node.id)),
                  url: e.target.value || undefined
                }
              })
            }
          />
        </div>
        <div className="insp-row insp-row--inline">
          <label className="insp-label">Метод</label>
          <select
            className="insp-select"
            value={node.integration?.method ?? "POST"}
            onChange={(e) =>
              onUpdate({
                integration: {
                  ...(node.integration ?? defaultIntegration(node.id)),
                  method: (e.target.value || undefined) as IntegrationCall["method"]
                }
              })
            }
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
        <label className="insp-checkbox-label">
          <input
            type="checkbox"
            checked={Boolean(node.integration?.continue_on_error)}
            onChange={(e) =>
              onUpdate({
                integration: {
                  ...(node.integration ?? defaultIntegration(node.id)),
                  continue_on_error: e.target.checked
                }
              })
            }
          />
          Не останавливать сценарий при ошибке ответа
        </label>
      </div>
      <div className="insp-section">
        <div className="insp-row">
          <label className="insp-label">Заголовки (JSON объект)</label>
          <textarea
            className="insp-textarea insp-textarea--code"
            rows={3}
            defaultValue={JSON.stringify(node.integration?.headers ?? {}, null, 2)}
            onBlur={(e) => {
              try {
                const headers = JSON.parse(e.target.value) as Record<string, string>;
                if (headers && typeof headers === "object" && !Array.isArray(headers)) {
                  onUpdate({
                    integration: {
                      ...(node.integration ?? defaultIntegration(node.id)),
                      headers
                    }
                  });
                }
              } catch {
                // ignore invalid json while editing
              }
            }}
          />
        </div>
        <div className="insp-row">
          <label className="insp-label">Тело запроса (JSON, подстановки JSONLogic)</label>
          <textarea
            key={`payload-${node.id}-${JSON.stringify(node.integration?.payload_map ?? {})}`}
            className="insp-textarea insp-textarea--code"
            rows={5}
            defaultValue={JSON.stringify(node.integration?.payload_map ?? {}, null, 2)}
            onBlur={(e) => {
              try {
                const payload = JSON.parse(e.target.value) as Record<string, unknown>;
                onUpdate({
                  integration: {
                    ...(node.integration ?? defaultIntegration(node.id)),
                    payload_map: payload
                  }
                });
              } catch {
                // ignore invalid json while editing
              }
            }}
          />
        </div>
        <div className="insp-row">
          <label className="insp-label">Сохранить ответ целиком в values (путь)</label>
          <input
            className="insp-input"
            value={node.integration?.store_as ?? ""}
            placeholder="например erp.raw_response"
            onChange={(e) =>
              onUpdate({
                integration: {
                  ...(node.integration ?? defaultIntegration(node.id)),
                  store_as: e.target.value.trim() || undefined
                }
              })
            }
          />
        </div>
        <div className="insp-row">
          <label className="insp-label">Разбор ответа в values (JSON: поле ответа → путь в values)</label>
          <textarea
            key={`respmap-${node.id}-${JSON.stringify(node.integration?.response_map ?? {})}`}
            className="insp-textarea insp-textarea--code"
            rows={4}
            defaultValue={JSON.stringify(node.integration?.response_map ?? {}, null, 2)}
            onBlur={(e) => {
              try {
                const response_map = JSON.parse(e.target.value) as Record<string, string>;
                if (response_map && typeof response_map === "object" && !Array.isArray(response_map)) {
                  onUpdate({
                    integration: {
                      ...(node.integration ?? defaultIntegration(node.id)),
                      response_map
                    }
                  });
                }
              } catch {
                // ignore
              }
            }}
          />
        </div>
      </div>
      <details className="cinsp-details">
        <summary>Политика выполнения (редко нужна)</summary>
        <GenericExecutionSection node={node} onUpdate={onUpdate} />
      </details>
    </div>
  );
}

function BranchLikeParameters({ node, onUpdate, title }: BaseProps & { title: string }) {
  const activeRule = node.rules?.[0];
  return (
    <div className="insp-section-list">
      <div className="insp-section">
        <div className="insp-section-title">{title}</div>
        <div className="insp-row">
          <label className="insp-label">Условие (JSONLogic)</label>
          <textarea
            className="insp-textarea insp-textarea--code"
            rows={3}
            defaultValue={JSON.stringify(activeRule?.when ?? true, null, 2)}
            onBlur={(e) => {
              try {
                const when = JSON.parse(e.target.value) as unknown;
                const currentRules = node.rules ?? [];
                const first = currentRules[0] ?? { id: `${node.id}_rule`, then: [] };
                onUpdate({
                  rules: [{ ...first, when }, ...currentRules.slice(1)]
                });
              } catch {
                // ignore
              }
            }}
          />
        </div>
      </div>
      <details className="cinsp-details">
        <summary>Политика выполнения (редко нужна)</summary>
        <GenericExecutionSection node={node} onUpdate={onUpdate} />
      </details>
    </div>
  );
}

export function ParametersTab({ node, schema, onUpdate }: Props) {
  if (node.type === "step") {
    return <FieldsTab node={node} schema={schema} onUpdate={onUpdate} />;
  }
  if (node.type === "document_request") {
    return <DocsTab node={node} onUpdate={onUpdate} />;
  }
  if (node.type === "integration_call") {
    return <IntegrationParameters node={node} schema={schema} onUpdate={onUpdate} />;
  }
  if (node.type === "branch") {
    return <BranchLikeParameters node={node} onUpdate={onUpdate} title="Настройки ветвления" />;
  }
  if (node.type === "validation_gate") {
    return <BranchLikeParameters node={node} onUpdate={onUpdate} title="Правило валидации" />;
  }
  if (node.type === "calculation") {
    return <BranchLikeParameters node={node} onUpdate={onUpdate} title="Правило расчета" />;
  }
  if (node.type === "sign") {
    return (
      <div className="insp-section-list">
        <GenericExecutionSection node={node} onUpdate={onUpdate} />
        <div className="insp-empty">
          Линейный шаг подписи: один вход и один выход «main». Заголовок — на вкладке «Узел».
        </div>
      </div>
    );
  }
  if (node.type === "approval") {
    return <BranchLikeParameters node={node} onUpdate={onUpdate} title="Логика согласования" />;
  }
  if (node.type === "switch") {
    return <SwitchConfigTab node={node} schema={schema} onUpdate={onUpdate} />;
  }

  return (
    <div className="insp-section-list">
      <GenericExecutionSection node={node} onUpdate={onUpdate} />
      <div className="insp-empty">Для этого узла параметры минимальны.</div>
    </div>
  );
}
