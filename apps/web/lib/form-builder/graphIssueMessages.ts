import type { FormSchema } from "@qalam/form-engine";
import type { GraphIssue } from "./graph";
import { NODE_TYPE_LABEL, type NodeTypeName } from "@/lib/constructor/nodeTypeMeta";
import { getConstructorNodeTitle } from "@/lib/constructor/nodeLabels";

/** Human-readable Russian text for a single graph validation issue. */
export function formatGraphIssue(issue: GraphIssue, schema: FormSchema): string {
  const p = issue.params as Record<string, string | number | undefined> | undefined;
  switch (issue.messageKey) {
    case "forms.graph_start_missing":
      return "Стартовый узел не найден в схеме или указан неверный ID старта.";
    case "forms.graph_end_recommended":
      return "Добавьте узел «Финиш» (end) или завершите сценарий узлом «HTTPS-запрос» с настроенным URL или адаптером.";
    case "forms.graph_start_count_invalid": {
      const c = p?.count ?? "?";
      return `Должен быть ровно один узел «Старт»; сейчас: ${c}.`;
    }
    case "forms.graph_node_type_limit_exceeded": {
      const rawType = String(p?.type ?? "");
      const typeLabel = NODE_TYPE_LABEL[rawType as NodeTypeName] ?? rawType;
      return `Превышен лимит узлов «${typeLabel}»: максимум ${p?.maxCount ?? "?"}, сейчас ${p?.count ?? "?"}.`;
    }
    case "forms.graph_broken_edge":
      return `Некорректная связь: ${p?.from ?? "?"} → ${p?.to ?? "?"}.`;
    case "forms.graph_node_unreachable": {
      const nodeId = String(p?.nodeId ?? "");
      const node = schema.nodes.find((n) => n.id === nodeId);
      const label = node ? getConstructorNodeTitle(node) : nodeId || "?";
      return nodeId ? `Узел «${label}» (${nodeId}) недостижим от старта.` : "Есть недостижимый узел.";
    }
    case "forms.graph_node_dead_end": {
      const nodeId = String(p?.nodeId ?? "");
      const node = schema.nodes.find((n) => n.id === nodeId);
      const label = node ? getConstructorNodeTitle(node) : nodeId || "?";
      return nodeId ? `У «${label}» (${nodeId}) нет исходящей связи (тупик).` : "Есть узел без исходящей связи.";
    }
    case "forms.graph_path_without_integration":
      return "Есть путь от старта к финишу без узла «HTTPS-запрос» с настроенным URL или адаптером. Добавьте отправку данных в API перед публикацией MVP.";
    case "forms.graph_node_settings_invalid": {
      const nodeId = String(p?.nodeId ?? "");
      const detail = String(p?.message ?? "Исправьте настройки узла.");
      const node = schema.nodes.find((n) => n.id === nodeId);
      const label = node ? getConstructorNodeTitle(node) : nodeId || "?";
      return nodeId ? `«${label}» (${nodeId}): ${detail}` : detail;
    }
    default:
      return `Ошибка графа (${issue.messageKey}).`;
  }
}

/** Node id to focus in the constructor when this issue is shown first (if any). */
export function graphIssueFocusNodeId(issue: GraphIssue): string | null {
  const raw = issue.params?.nodeId;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  if (issue.messageKey === "forms.graph_broken_edge") {
    const from = issue.params?.from;
    if (typeof from === "string" && from.trim()) {
      return from.trim();
    }
  }
  return null;
}
