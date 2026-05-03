import type { FormNode, NodeType } from "@qalam/form-engine";
export const SWITCH_EXTRA_OUTPUT_ID = "__switch_fallback__";

export type ConstructorPort = {
  id: string;
  label: string;
};

export type ConstructorTab = "node" | "params" | "rules" | "json";

export type NodeValidationIssue = {
  key: string;
  message: string;
};

export type NodeTypeDefinition = {
  type: NodeType;
  inputs: ConstructorPort[];
  outputs: ConstructorPort[] | ((node: FormNode) => ConstructorPort[]);
  tabs: ConstructorTab[];
  maxCount?: number;
  validate(node: FormNode): NodeValidationIssue[];
};

function resolveSwitchOutputs(node: FormNode): ConstructorPort[] {
  const cfg = node.switch;
  if (!cfg) {
    return [];
  }

  const extraFallback = cfg.fallback?.mode === "extra";
  if (cfg.mode === "expression") {
    const count = Math.max(1, Math.floor(cfg.numberOutputs ?? 2));
    const outputs = Array.from({ length: count }, (_, index) => ({
      id: String(index),
      label: String(index)
    }));
    return extraFallback
      ? [...outputs, { id: SWITCH_EXTRA_OUTPUT_ID, label: String(outputs.length) }]
      : outputs;
  }

  const routes = cfg.routes ?? [];
  const outputs = routes.map((route) => ({
    id: route.id,
    label: route.label?.trim() || String(route.value)
  }));
  return extraFallback
    ? [...outputs, { id: SWITCH_EXTRA_OUTPUT_ID, label: String(outputs.length) }]
    : outputs;
}

function validateTitle(node: FormNode): NodeValidationIssue[] {
  if (node.title_key && node.title_key.trim().length > 0) {
    return [];
  }
  return [{ key: "title", message: "Укажите заголовок" }];
}

export const NODE_TYPE_REGISTRY: Record<NodeType, NodeTypeDefinition> = {
  start: {
    type: "start",
    inputs: [],
    outputs: [{ id: "main", label: "main" }],
    tabs: ["node", "params", "json"],
    maxCount: 1,
    validate(node) {
      return [];
    }
  },
  step: {
    type: "step",
    inputs: [{ id: "in", label: "in" }],
    outputs: [{ id: "main", label: "main" }],
    tabs: ["node", "params", "rules", "json"],
    validate(node) {
      const issues: NodeValidationIssue[] = [];
      if (!node.fields || node.fields.length === 0) {
        issues.push({ key: "fields", message: "Для шага добавьте минимум одно поле" });
      }
      return issues;
    }
  },
  branch: {
    type: "branch",
    inputs: [{ id: "in", label: "in" }],
    outputs: [
      { id: "true", label: "true" },
      { id: "false", label: "false" }
    ],
    tabs: ["node", "params", "rules", "json"],
    validate(node) {
      const issues = validateTitle(node);
      if (!node.rules || node.rules.length === 0) {
        issues.push({ key: "rules", message: "Добавьте правило ветвления (JSONLogic)" });
      }
      return issues;
    }
  },
  switch: {
    type: "switch",
    inputs: [{ id: "in", label: "in" }],
    outputs: resolveSwitchOutputs,
    tabs: ["node", "params", "json"],
    validate(node) {
      const issues = validateTitle(node);
      const cfg = node.switch;
      if (!cfg) {
        issues.push({ key: "switch", message: "Настройте параметры switch-узла" });
        return issues;
      }
      if (cfg.mode !== "rules" && cfg.mode !== "expression") {
        issues.push({ key: "mode", message: "Выберите режим switch: rules или expression" });
      }
      if (cfg.mode === "rules") {
        if (!cfg.sourceFieldId?.trim()) {
          issues.push({ key: "source", message: "Выберите поле-источник для маршрутизации" });
        }
        if (!cfg.routes || cfg.routes.length === 0) {
          issues.push({ key: "routes", message: "Добавьте минимум один маршрут switch" });
        }
      }
      if (cfg.mode === "expression") {
        if (cfg.expression === undefined) {
          issues.push({ key: "expression", message: "Укажите выражение для выбора выхода" });
        }
        if (!cfg.numberOutputs || cfg.numberOutputs <= 0) {
          issues.push({ key: "outputs", message: "Укажите число выходов switch больше нуля" });
        }
      }
      return issues;
    }
  },
  validation_gate: {
    type: "validation_gate",
    inputs: [{ id: "in", label: "in" }],
    outputs: [
      { id: "pass", label: "pass" },
      { id: "fail", label: "fail" }
    ],
    tabs: ["node", "params", "rules", "json"],
    validate(node) {
      const issues = validateTitle(node);
      if (!node.rules || node.rules.length === 0) {
        issues.push({ key: "rules", message: "Добавьте правило проверки" });
      }
      return issues;
    }
  },
  calculation: {
    type: "calculation",
    inputs: [{ id: "in", label: "in" }],
    outputs: [{ id: "main", label: "main" }],
    tabs: ["node", "params", "rules", "json"],
    validate(node) {
      const issues = validateTitle(node);
      if (!node.rules || node.rules.length === 0) {
        issues.push({ key: "rules", message: "Добавьте правило расчета (set_value)" });
      }
      return issues;
    }
  },
  document_request: {
    type: "document_request",
    inputs: [{ id: "in", label: "in" }],
    outputs: [{ id: "main", label: "main" }],
    tabs: ["node", "params", "rules", "json"],
    validate(node) {
      const issues = validateTitle(node);
      if (!node.documents || node.documents.length === 0) {
        issues.push({ key: "documents", message: "Добавьте хотя бы один требуемый документ" });
      }
      return issues;
    }
  },
  integration_call: {
    type: "integration_call",
    inputs: [{ id: "in", label: "in" }],
    outputs: [
      { id: "success", label: "success" },
      { id: "error", label: "error" }
    ],
    tabs: ["node", "params", "rules", "json"],
    validate(node) {
      return [];
    }
  },
  sign: {
    type: "sign",
    inputs: [{ id: "in", label: "in" }],
    outputs: [{ id: "main", label: "main" }],
    tabs: ["node", "params", "rules", "json"],
    validate(node) {
      return [];
    }
  },
  approval: {
    type: "approval",
    inputs: [{ id: "in", label: "in" }],
    outputs: [
      { id: "approved", label: "approved" },
      { id: "rework", label: "rework" },
      { id: "rejected", label: "rejected" }
    ],
    tabs: ["node", "params", "rules", "json"],
    validate(node) {
      const issues = validateTitle(node);
      if (!node.rules || node.rules.length === 0) {
        issues.push({ key: "rules", message: "Добавьте правило решения согласования" });
      }
      return issues;
    }
  },
  end: {
    type: "end",
    inputs: [{ id: "in", label: "in" }],
    outputs: [],
    tabs: ["node", "params", "json"],
    validate(node) {
      return [];
    }
  }
};

export function getNodeDefinition(type: NodeType): NodeTypeDefinition {
  return NODE_TYPE_REGISTRY[type];
}

export function getNodeOutputs(node: FormNode): ConstructorPort[] {
  const outputs = getNodeDefinition(node.type).outputs;
  return typeof outputs === "function" ? outputs(node) : outputs;
}
