export type NodeTypeName =
  | "start"
  | "step"
  | "branch"
  | "switch"
  | "validation_gate"
  | "calculation"
  | "document_request"
  | "integration_call"
  | "sign"
  | "approval"
  | "end";

export const NODE_TYPE_ACCENT: Record<NodeTypeName, string> = {
  start: "#e11d48",
  step: "#2563eb",
  branch: "#9333ea",
  switch: "#0f766e",
  validation_gate: "#d97706",
  calculation: "#0891b2",
  document_request: "#65a30d",
  integration_call: "#4f46e5",
  sign: "#c026d3",
  approval: "#db2777",
  end: "#475569"
};

export const NODE_TYPE_LABEL: Record<NodeTypeName, string> = {
  start: "Старт",
  step: "Форма",
  branch: "Ветвление",
  switch: "Разветвление",
  validation_gate: "Валидация",
  calculation: "Расчёт",
  document_request: "Документы",
  integration_call: "HTTPS-запрос",
  sign: "Подпись",
  approval: "Согласование",
  end: "Финиш"
};

export const NODE_TYPE_DESCRIPTION: Record<NodeTypeName, string> = {
  start: "Точка входа в сценарий",
  step: "Экран с полями формы",
  branch: "Два выхода true/false (как IF в n8n)",
  switch: "Разветвление по ответу формы или выражению",
  validation_gate: "Проверка условий прохода",
  calculation: "Автоматический расчёт значений",
  document_request: "Запрос и загрузка документов",
  integration_call: "Отправка данных по HTTPS во внешний API",
  sign: "Линейный шаг: подтверждение и учебная имитация подписи (один выход)",
  approval: "Ветвление согласования: approved / rework / rejected",
  end: "Конец сценария"
};
