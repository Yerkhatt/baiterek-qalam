"use client";

import type { FormNode, FormSchema } from "@qalam/form-engine";
import { JsonTab } from "./inspector/JsonTab";
import { NodeTab } from "./inspector/NodeTab";
import { ParametersTab } from "./inspector/ParametersTab";
import { RulesTab } from "./inspector/RulesTab";
import { NODE_TYPE_ACCENT, NODE_TYPE_LABEL, NodeIcon, type NodeTypeName } from "./NodeIcon";
import { getNodeDefinition, type ConstructorTab } from "@/lib/form-builder/nodeTypeRegistry";
import { t } from "@/lib/i18n";

interface Props {
  node: FormNode;
  schema: FormSchema;
  onUpdate: (updates: Partial<FormNode>) => void;
  onSchemaUpdate: (updater: (prev: FormSchema) => FormSchema) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function ConstructorInspector({ node, schema, onUpdate, onSchemaUpdate, onRemove, onClose }: Props) {
  const definition = getNodeDefinition(node.type);
  const accent = NODE_TYPE_ACCENT[node.type as keyof typeof NODE_TYPE_ACCENT] ?? "#64748b";
  const stackTabs = definition.tabs.filter((t): t is Exclude<ConstructorTab, "json"> => t !== "json");
  const hasJson = definition.tabs.includes("json");
  const isStep = node.type === "step";
  const stackWithoutDeferredRules = stackTabs.filter((t) => !(isStep && t === "rules"));
  const showDeferredRules = isStep && stackTabs.includes("rules");

  const typeLabel = NODE_TYPE_LABEL[node.type as NodeTypeName] ?? node.type;

  return (
    <div className="cinsp">
      <div className="cinsp-head">
        <span className="cinsp-node-icon" style={{ background: accent }}>
          <NodeIcon type={node.type} size={14} />
        </span>
        <div className="cinsp-head-titles">
          <span className="cinsp-node-display" id="cinsp-dialog-title">
            {typeLabel}
          </span>
        </div>
        <button
          type="button"
          className="cinsp-close"
          aria-label="Закрыть"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="cinsp-body cinsp-body--unified">
        <div className="cinsp-unified-inner">
          {stackWithoutDeferredRules.map((tab) => {
            if (tab === "node") {
              return (
                <NodeTab
                  key="tab-node"
                  node={node}
                  schema={schema}
                  onUpdate={onUpdate}
                  onSchemaUpdate={onSchemaUpdate}
                  compactTitle
                />
              );
            }
            if (tab === "params") {
              return <ParametersTab key="tab-params" node={node} schema={schema} onUpdate={onUpdate} />;
            }
            if (tab === "rules") {
              return <RulesTab key="tab-rules" node={node} onUpdate={onUpdate} />;
            }
            return null;
          })}

          {showDeferredRules ? (
            <details className="cinsp-details">
              <summary>Правила (необязательно)</summary>
              <RulesTab node={node} onUpdate={onUpdate} />
            </details>
          ) : null}

          {hasJson ? (
            <details className="cinsp-details cinsp-details--json">
              <summary>{t("forms.constructor.form_builder.code_section")}</summary>
              <JsonTab node={node} onUpdate={onUpdate} embedded />
            </details>
          ) : null}

          <div className="insp-section insp-section--gf-footer cinsp-unified-footer">
            <button type="button" className="insp-btn-danger insp-btn-danger--gf" onClick={onRemove}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M2 4h12M6 4V2h4v2M5 4l1 9h4l1-9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Удалить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
