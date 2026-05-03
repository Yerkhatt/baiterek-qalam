"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import jsonLogic from "json-logic-js";
import {
  evaluateNode,
  EvaluationResult,
  FieldOption,
  FormField,
  FormNode,
  FormSchema,
  RuleEvent,
  RuntimeState,
  TableColumn,
  getPath,
  setPath
} from "@qalam/form-engine";
import { t } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { resolveStaleDemoTitle } from "@/lib/serviceCatalog";
import { advanceToInteractiveNode } from "@/lib/runtime/advance";
import {
  evaluateRuntimeNode,
  fetchRuntime,
  saveRuntime,
  submitApplication
} from "@/lib/runtimeApi";
import {
  appendCabinetApplication,
  PENDING_EGOV_SIGN_KEY,
  type PendingEgovSignPayload
} from "@/lib/cabinetSession";
import SectionHeading from "@/components/SectionHeading";
import { useRouter } from "next/navigation";

const EMPTY_STATE: RuntimeState = {
  values: {},
  files: {},
  errors: {},
  visibility: {},
  required: {},
  stepStatus: {}
};

function integrationLeafConfigured(node: FormNode | undefined): boolean {
  return node?.type === "integration_call";
}

function nodeHasOutgoing(schema: FormSchema, nodeId: string): boolean {
  const node = schema.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return false;
  }
  const next = node.next;
  if (Array.isArray(next) ? next.length > 0 : Boolean(next)) {
    return true;
  }
  if (schema.edges && schema.edges.length > 0) {
    return schema.edges.some((edge) => edge.from === nodeId);
  }
  return false;
}

function isTerminalIntegrationLeaf(schema: FormSchema, nodeId: string): boolean {
  const node = schema.nodes.find((n) => n.id === nodeId);
  if (!integrationLeafConfigured(node)) {
    return false;
  }
  return !nodeHasOutgoing(schema, nodeId);
}

function isSubmittedRuntimeSnapshot(schema: FormSchema, snapshot: { nodeId: string; state: RuntimeState }): boolean {
  const endNode = schema.nodes.find((n) => n.type === "end");
  if (
    endNode &&
    snapshot.nodeId === endNode.id &&
    snapshot.state.stepStatus?.[endNode.id] === "complete"
  ) {
    return true;
  }
  if (
    isTerminalIntegrationLeaf(schema, snapshot.nodeId) &&
    snapshot.state.stepStatus?.[snapshot.nodeId] === "complete"
  ) {
    return true;
  }
  return false;
}

/** True if the next hop from this node is a `sign` node (edges or `next`). Used for inline «Подписать» on the last form. */
function immediateNextIncludesSign(schema: FormSchema, fromId: string): boolean {
  const byId = new Map(schema.nodes.map((n) => [n.id, n]));
  const targets = new Set<string>();
  const node = byId.get(fromId);
  if (!node) {
    return false;
  }
  const nx = node.next;
  if (Array.isArray(nx)) {
    for (const id of nx) {
      targets.add(id);
    }
  } else if (typeof nx === "string" && nx) {
    targets.add(nx);
  }
  for (const edge of schema.edges ?? []) {
    if (edge.from === fromId) {
      targets.add(edge.to);
    }
  }
  for (const tid of targets) {
    if (byId.get(tid)?.type === "sign") {
      return true;
    }
  }
  return false;
}

type FormRuntimeProps = {
  appId: string;
  schema: FormSchema;
  /** Public/cabinet flows: used for eGov sign redirect and session payload. */
  serviceId?: string;
  /** When true, skip API load/save (builder preview only). */
  previewMode?: boolean;
};

const PROGRESS_NODE_TYPES = new Set<FormNode["type"]>([
  "step",
  "document_request",
  "approval",
  "end"
]);

export default function FormRuntime({ appId, schema, serviceId, previewMode }: FormRuntimeProps) {
  const router = useRouter();
  const [state, setState] = useState<RuntimeState>(EMPTY_STATE);
  const [nodeId, setNodeId] = useState<string>(schema.start);
  const [history, setHistory] = useState<string[]>([]);
  const [events, setEvents] = useState<RuleEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentNode = useMemo(() => {
    return schema.nodes.find((node) => node.id === nodeId) ?? schema.nodes[0];
  }, [schema.nodes, nodeId]);

  const stepProgress = useMemo(() => {
    const byId = new Map(schema.nodes.map((node) => [node.id, node]));
    const visited = [...history, nodeId];
    const interactiveVisited = visited.filter((id) => PROGRESS_NODE_TYPES.has(byId.get(id)?.type ?? "start"));
    return Math.max(1, interactiveVisited.length);
  }, [history, nodeId, schema.nodes]);

  const primaryIsSign = useMemo(() => {
    if (submitted) {
      return false;
    }
    if (currentNode.type !== "step" && currentNode.type !== "document_request") {
      return false;
    }
    return immediateNextIncludesSign(schema, currentNode.id);
  }, [submitted, currentNode.type, currentNode.id, schema]);

  useEffect(() => {
    let active = true;
    const evaluateAtNodeLocal = async (targetNodeId: string, nextState: RuntimeState): Promise<EvaluationResult> => {
      let result = evaluateNode(schema, nextState, targetNodeId);
      const targetNode = schema.nodes.find((node) => node.id === targetNodeId);
      if (targetNode?.type === "integration_call") {
        try {
          result = await evaluateRuntimeNode(schema, nextState, targetNodeId);
        } catch {
          // fall back to in-browser evaluation when API is unavailable
        }
      }
      return result;
    };
    const load = async () => {
      if (previewMode) {
        const result = await advanceToInteractiveNode({
          schema,
          startNodeId: schema.start,
          state: { ...EMPTY_STATE },
          evaluateAtNode: evaluateAtNodeLocal
        });
        if (!active) {
          return;
        }
        setState(result.state);
        setNodeId(result.nodeId);
        setHistory([]);
        setEvents(result.events);
        setSubmitted(false);
        setHydrated(true);
        return;
      }

      try {
        const snapshot = await fetchRuntime(appId);
        if (!active) {
          return;
        }
        if (snapshot) {
          const advanced = await advanceToInteractiveNode({
            schema,
            startNodeId: snapshot.nodeId,
            state: snapshot.state,
            evaluateAtNode: evaluateAtNodeLocal
          });
          if (!active) {
            return;
          }
          const landedNode = schema.nodes.find((n) => n.id === advanced.nodeId);
          const isEditableForm = landedNode?.type === "step" || landedNode?.type === "document_request";

          let mergedState = advanced.state;
          let mergedEvents = [...(snapshot.events ?? []), ...advanced.events];

          /** Re-validate against current schema (new fields / rules); advance alone does not re-run evaluate on interactive nodes. */
          if (isEditableForm) {
            const refreshed = evaluateNode(schema, mergedState, advanced.nodeId);
            mergedState = refreshed.state;
            mergedEvents = [...mergedEvents, ...refreshed.events];
          }

          setState(mergedState);
          setNodeId(advanced.nodeId);
          setHistory(snapshot.history);
          setEvents(mergedEvents);
          /** Do not show «Отправлено» / disable Continue while user is on an editable form screen (fixes stale snapshot after schema changes). */
          setSubmitted(isEditableForm ? false : isSubmittedRuntimeSnapshot(schema, snapshot));
          setHydrated(true);
          return;
        }
      } catch {
        if (!active) {
          return;
        }
      }

      const result = await advanceToInteractiveNode({
        schema,
        startNodeId: schema.start,
        state: { ...EMPTY_STATE },
        evaluateAtNode: evaluateAtNodeLocal
      });
      if (!active) {
        return;
      }
      setState(result.state);
      setNodeId(result.nodeId);
      setEvents(result.events);
      setSubmitted(false);
      setHydrated(true);
    };

    void load();
    return () => {
      active = false;
    };
  }, [appId, previewMode, schema]);

  useEffect(() => {
    if (previewMode || !hydrated) {
      return;
    }
    const handle = window.setTimeout(() => {
      void saveRuntime(appId, { appId, nodeId, history, state, events }).catch(() => null);
    }, 400);
    return () => {
      window.clearTimeout(handle);
    };
  }, [appId, events, history, hydrated, nodeId, previewMode, state]);

  const pushEvents = useCallback(
    (newEvents: RuleEvent[]) => {
      if (newEvents.length === 0) {
        return;
      }
      setEvents((prev) => [...prev, ...newEvents]);
    },
    []
  );

  const evaluateAtNode = useCallback(
    async (targetNodeId: string, nextState: RuntimeState): Promise<EvaluationResult> => {
      let result = evaluateNode(schema, nextState, targetNodeId);
      const targetNode = schema.nodes.find((node) => node.id === targetNodeId);
      if (targetNode?.type === "integration_call") {
        try {
          result = await evaluateRuntimeNode(schema, nextState, targetNodeId);
        } catch {
          // fall back to in-browser evaluation when API is unavailable
        }
      }
      return result;
    },
    [schema]
  );

  const runEvaluation = useCallback(
    async (nextState: RuntimeState) => {
      const result = await evaluateAtNode(nodeId, nextState);
      setState(result.state);
      pushEvents(result.events);
      return result;
    },
    [evaluateAtNode, nodeId, pushEvents]
  );

  const updateValue = useCallback(
    (path: string, value: unknown) => {
      const nextState: RuntimeState = {
        ...state,
        values: { ...(state.values ?? {}) },
        files: { ...(state.files ?? {}) },
        errors: { ...(state.errors ?? {}) },
        visibility: { ...(state.visibility ?? {}) },
        required: { ...(state.required ?? {}) },
        stepStatus: { ...(state.stepStatus ?? {}) }
      };
      setPath(nextState.values as Record<string, unknown>, path, value);
      void runEvaluation(nextState);
    },
    [runEvaluation, state]
  );

  const updateFiles = useCallback(
    (docId: string, files: File[]) => {
      const nextState: RuntimeState = {
        ...state,
        values: { ...(state.values ?? {}) },
        files: { ...(state.files ?? {}) },
        errors: { ...(state.errors ?? {}) },
        visibility: { ...(state.visibility ?? {}) },
        required: { ...(state.required ?? {}) },
        stepStatus: { ...(state.stepStatus ?? {}) }
      };
      nextState.files = nextState.files ?? {};
      nextState.files[docId] = files.map((file) => ({
        name: file.name,
        mimeType: file.type,
        sizeMb: Math.round((file.size / 1024 / 1024) * 100) / 100
      }));
      void runEvaluation(nextState);
    },
    [runEvaluation, state]
  );

  const goNext = useCallback(() => {
    void (async () => {
      const result = await runEvaluation(state);
      const status = result.state.stepStatus?.[nodeId];
      if (status !== "complete") {
        return;
      }

      /** Same eGov mock flow as terminal `end`: Узел «Подпись» ведёт на /auth/egov-sign, затем цепочка sign→API выполняется после подтверждения. */
      if (primaryIsSign && !previewMode) {
        const mergedEvents = [...events, ...(result.events ?? [])];
        const nextHistory = [...history, nodeId];
        try {
          await saveRuntime(appId, {
            appId,
            nodeId,
            history: nextHistory,
            state: result.state,
            events: mergedEvents
          });
        } catch {
          /* still open sign flow */
        }
        const payload: PendingEgovSignPayload = {
          appId,
          serviceId: (serviceId ?? "").trim(),
          returnTo: "/cabinet/applications",
          serviceTitle: resolveStaleDemoTitle(
            (schema.metadata?.title ?? "").trim(),
            (serviceId ?? "").trim() || appId
          )
        };
        try {
          sessionStorage.setItem(PENDING_EGOV_SIGN_KEY, JSON.stringify(payload));
        } catch {
          return;
        }
        router.push("/auth/egov-sign");
        return;
      }

      const isEgovTerminal = currentNode.type === "end";

      if (isEgovTerminal && !previewMode) {
        const mergedEvents = [...events, ...(result.events ?? [])];
        try {
          await saveRuntime(appId, {
            appId,
            nodeId,
            history,
            state: result.state,
            events: mergedEvents
          });
        } catch {
          /* still try to open sign flow */
        }
        const payload: PendingEgovSignPayload = {
          appId,
          serviceId: (serviceId ?? "").trim(),
          returnTo: "/cabinet/applications",
          serviceTitle: resolveStaleDemoTitle(
            (schema.metadata?.title ?? "").trim(),
            (serviceId ?? "").trim() || appId
          )
        };
        try {
          sessionStorage.setItem(PENDING_EGOV_SIGN_KEY, JSON.stringify(payload));
        } catch {
          return;
        }
        router.push("/auth/egov-sign");
        return;
      }

      if (result.nextNodeId) {
        try {
          const nextHistory = [...history, nodeId];
          const advanced = await advanceToInteractiveNode({
            schema,
            startNodeId: result.nextNodeId,
            state: result.state,
            evaluateAtNode
          });
          const mergedEvents = [...events, ...(result.events ?? []), ...advanced.events];
          setState(advanced.state);
          pushEvents(advanced.events);
          setHistory(nextHistory);
          setNodeId(advanced.nodeId);

          if (advanced.stalled) {
            if (!previewMode) {
              const snapshot = {
                appId,
                nodeId: advanced.nodeId,
                history: nextHistory,
                state: advanced.state,
                events: mergedEvents
              };
              try {
                await saveRuntime(appId, snapshot);
              } catch {
                /* still try submit */
              }
              try {
                await submitApplication(appId, snapshot);
              } catch {
                /* submitted badge only */
              }
              appendCabinetApplication({
                appId,
                serviceId: (serviceId ?? "").trim(),
                serviceTitle: resolveStaleDemoTitle(
                  (schema.metadata?.title ?? "").trim(),
                  (serviceId ?? "").trim() || appId
                ),
                submittedAt: new Date().toISOString()
              });
            }
            setSubmitted(true);
          }
        } catch {
          setHistory((prev) => [...prev, nodeId]);
          setNodeId(result.nextNodeId);
        }
      }
    })();
  }, [
    appId,
    currentNode.type,
    evaluateAtNode,
    events,
    history,
    nodeId,
    previewMode,
    primaryIsSign,
    pushEvents,
    router,
    runEvaluation,
    schema,
    serviceId,
    state
  ]);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const nextHistory = [...prev];
      const previous = nextHistory.pop();
      if (previous) {
        setNodeId(previous);
      }
      return nextHistory;
    });
  }, []);

  return (
    <div className="runtime-shell">
      <SectionHeading
        eyebrow={t("forms.runtime_title")}
        title={resolveRuntimeShellTitle()}
        subtitle={t("forms.runtime_subtitle")}
      />
      <div className="card card--outline runtime-card">
        <div className="stack">
          <div className="form-actions">
            <span className="badge badge--muted">
              {t("forms.runtime_step", { value: stepProgress })}
            </span>
          </div>
          {Object.keys(state.errors ?? {}).length > 0 ? (
            <div className="form-error">{t("forms.resolve_errors_hint")}</div>
          ) : null}
          {submitted ? (
            <div className="badge badge--muted">{t("common.status_submitted")}</div>
          ) : null}
          {submitted && currentNode.type === "integration_call" ? (
            <p className="text-muted">{t("forms.after_sign_submit")}</p>
          ) : currentNode.type === "integration_call" ? (
            <p className="text-muted">{t("forms.integration_silent_wait")}</p>
          ) : (
            renderNode(currentNode, schema, state, updateValue, updateFiles)
          )}
          <div className="form-actions">
            <button
              className="button button--ghost"
              type="button"
              onClick={goBack}
              disabled={history.length === 0}
            >
              {t("common.back")}
            </button>
            <button
              className="button button--primary"
              type="button"
              onClick={goNext}
              disabled={submitted}
            >
              {currentNode.type === "end"
                ? previewMode
                  ? t("forms.submit")
                  : t("forms.sign_egov")
                : primaryIsSign
                  ? t("forms.sign_button")
                  : currentNode.type === "approval"
                    ? t("forms.submit")
                    : t("common.continue")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Neutral shell title — service marketing title is not shown on the form surface. */
function resolveRuntimeShellTitle(): string {
  return t("forms.runtime_application_heading");
}

function renderNode(
  node: FormNode,
  schema: FormSchema,
  state: RuntimeState,
  updateValue: (path: string, value: unknown) => void,
  updateFiles: (docId: string, files: File[]) => void
) {
  if (node.type === "document_request") {
    return renderDocuments(node, state, updateFiles);
  }

  if (node.type === "sign" && (!node.fields || node.fields.length === 0)) {
    return <div className="text-muted">{t("forms.sign_step_hint")}</div>;
  }

  if (!node.fields || node.fields.length === 0) {
    return <div className="text-muted">{t("forms.no_fields")}</div>;
  }

  return (
    <div className="form-grid">
      {node.fields.map((field, index) => (
        <FieldRenderer
          key={field.id}
          field={field}
          fieldIndex={index}
          schema={schema}
          state={state}
          updateValue={updateValue}
        />
      ))}
    </div>
  );
}

function FieldRenderer({
  field,
  fieldIndex,
  schema,
  state,
  updateValue
}: {
  field: FormField;
  fieldIndex: number;
  schema: FormSchema;
  state: RuntimeState;
  updateValue: (path: string, value: unknown) => void;
}) {
  const visible = state.visibility?.[field.id] ?? true;
  if (!visible) {
    return null;
  }

  if (field.type === "table") {
    return (
      <TableField field={field} fieldIndex={fieldIndex} schema={schema} state={state} updateValue={updateValue} />
    );
  }

  const value = getPath(state.values, field.id);
  const errorKey = state.errors?.[field.id];
  const required = typeof field.required === "boolean" ? field.required : state.required?.[field.id];

  const label = resolveFieldLabel(field, fieldIndex);
  const options = resolveOptions(field, schema);

  if (field.type === "checkbox") {
    return (
      <div className="form-field">
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => updateValue(field.id, event.target.checked)}
          />
          <span>{label}</span>
        </label>
        {errorKey ? <div className="form-error">{t(errorKey)}</div> : null}
      </div>
    );
  }

  const inputType = field.type === "number" ? "number" : "text";

  return (
    <div className="form-field">
      <label className="form-label">
        {label}
        {required ? <span className="form-required">*</span> : null}
      </label>
      {field.type === "select" ? (
        <select
          className="form-select"
          value={value == null ? "" : String(value)}
          onChange={(event) => updateValue(field.id, event.target.value)}
        >
          <option value="">{t("forms.select_placeholder")}</option>
          {options.map((option, index) => (
            <option key={String(option.value)} value={option.value}>
              {resolveOptionLabel(option, index)}
            </option>
          ))}
        </select>
      ) : field.type === "radio" ? (
        <div className="form-radio-group" role="radiogroup" aria-label={label}>
          {options.map((option, index) => (
            <label key={String(option.value)} className="form-radio-option">
              <input
                type="radio"
                name={field.id}
                value={String(option.value)}
                checked={value === option.value}
                onChange={() => updateValue(field.id, option.value)}
              />
              <span>{resolveOptionLabel(option, index)}</span>
            </label>
          ))}
        </div>
      ) : field.type === "date" ? (
        <input
          className="form-input"
          type="date"
          value={typeof value === "string" ? value.slice(0, 10) : ""}
          onChange={(event) => updateValue(field.id, event.target.value)}
          readOnly={Boolean(field.read_only)}
        />
      ) : field.multiline ? (
        <textarea
          className="form-textarea"
          value={value == null ? "" : String(value)}
          onChange={(event) => updateValue(field.id, event.target.value)}
        />
      ) : (
        <input
          className="form-input"
          type={inputType}
          value={value == null ? "" : String(value)}
          onChange={(event) =>
            updateValue(
              field.id,
              field.type === "number" && event.target.value !== ""
                ? Number(event.target.value)
                : event.target.value
            )
          }
          readOnly={Boolean(field.read_only)}
        />
      )}
      {errorKey ? <div className="form-error">{t(errorKey)}</div> : null}
    </div>
  );
}

function TableField({
  field,
  fieldIndex,
  schema,
  state,
  updateValue
}: {
  field: FormField;
  fieldIndex: number;
  schema: FormSchema;
  state: RuntimeState;
  updateValue: (path: string, value: unknown) => void;
}) {
  const errorKey = state.errors?.[field.id];
  const rows = (getPath(state.values, field.id) as Record<string, unknown>[]) ?? [];
  const columns = field.columns ?? [];

  const addRow = () => {
    updateValue(field.id, [...rows, {}]);
  };

  const removeRow = (index: number) => {
    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
    updateValue(field.id, nextRows);
  };

  return (
    <div className="form-field">
      <div className="form-label">{resolveFieldLabel(field, fieldIndex)}</div>
      <div className="table">
        <div className="table-head">
          {columns.map((column, index) => (
            <div className="table-cell" key={column.id}>
              {resolveColumnLabel(column, index)}
            </div>
          ))}
          <div className="table-cell"></div>
        </div>
        {rows.map((row, rowIndex) => (
          <div className="table-row" key={`row-${rowIndex}`}>
            {columns.map((column) => (
              <TableCell
                key={`${rowIndex}-${column.id}`}
                column={column}
                row={row}
                schema={schema}
                onChange={(value) => {
                  const nextRows = [...rows];
                  const nextRow = { ...(nextRows[rowIndex] ?? {}) };
                  nextRow[column.id] = value;
                  nextRows[rowIndex] = nextRow;
                  updateValue(field.id, nextRows);
                }}
              />
            ))}
            <div className="table-cell">
              <button
                className="button button--ghost button--small"
                type="button"
                onClick={() => removeRow(rowIndex)}
              >
                {t("forms.remove_row")}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="table-actions">
        <button className="button button--outline button--small" type="button" onClick={addRow}>
          {t("forms.add_row")}
        </button>
        <span className="text-muted">{t("forms.rows_count", { value: rows.length })}</span>
      </div>
      {errorKey ? <div className="form-error">{t(errorKey)}</div> : null}
    </div>
  );
}

function TableCell({
  column,
  row,
  schema,
  onChange
}: {
  column: TableColumn;
  row: Record<string, unknown>;
  schema: FormSchema;
  onChange: (value: unknown) => void;
}) {
  const value = row[column.id];
  const options = resolveColumnOptions(column, schema);

  if (column.calc) {
    const computed = jsonLogic.apply(column.calc, { row });
    return (
      <div className="table-cell">
        <div className="form-input form-input--readonly">{formatNumber(Number(computed || 0))}</div>
      </div>
    );
  }

  if (column.type === "select") {
    return (
      <div className="table-cell">
        <select
          className="form-select"
          value={value == null ? "" : String(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{t("forms.select_placeholder")}</option>
          {options.map((option, index) => (
            <option key={String(option.value)} value={option.value}>
              {resolveOptionLabel(option, index)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const inputType = column.type === "number" ? "number" : "text";

  return (
    <div className="table-cell">
      <input
        className="form-input"
        type={inputType}
        value={value == null ? "" : String(value)}
        onChange={(event) =>
          onChange(
            column.type === "number" && event.target.value !== ""
              ? Number(event.target.value)
              : event.target.value
          )
        }
      />
    </div>
  );
}

function resolveLabel(labelKey: string | undefined): string | null {
  const raw = (labelKey ?? "").trim();
  if (!raw) {
    return null;
  }
  const translated = t(raw);
  return translated === raw ? raw : translated;
}

function resolveFieldLabel(field: FormField, index: number): string {
  return resolveLabel(field.label_key) ?? t("forms.unnamed_question", { value: index + 1 });
}

function resolveColumnLabel(column: TableColumn, index: number): string {
  return resolveLabel(column.label_key) ?? t("forms.unnamed_column", { value: index + 1 });
}

function resolveOptionLabel(option: FieldOption, index: number): string {
  return resolveLabel(option.label_key) ?? t("forms.unnamed_option", { value: index + 1 });
}

function resolveOptions(field: FormField, schema: FormSchema) {
  if (Array.isArray(field.options)) {
    return field.options;
  }
  if (typeof field.options === "string") {
    return schema.dictionaries?.[field.options] ?? [];
  }
  return [];
}

function resolveColumnOptions(column: TableColumn, schema: FormSchema) {
  if (Array.isArray(column.options)) {
    return column.options;
  }
  if (typeof column.options === "string") {
    return schema.dictionaries?.[column.options] ?? [];
  }
  return [];
}

function renderDocuments(
  node: FormNode,
  state: RuntimeState,
  updateFiles: (docId: string, files: File[]) => void
) {
  return (
    <div className="form-grid">
      {(node.documents ?? []).map((doc, index) => {
        const files = state.files?.[doc.id] ?? [];
        const errorKey = state.errors?.[doc.id];
        const required = typeof doc.required === "boolean" ? doc.required : state.required?.[doc.id];
        const allowMultiple = typeof doc.max_count !== "number" || doc.max_count > 1;
        const docLabel = resolveLabel(doc.label_key) ?? t("forms.unnamed_document", { value: index + 1 });

        return (
          <div className="form-field" key={doc.id}>
            <label className="form-label">
              {docLabel}
              {required ? <span className="form-required">*</span> : null}
            </label>
            <input
              className="form-input"
              type="file"
              multiple={allowMultiple}
              onChange={(event) =>
                updateFiles(doc.id, event.target.files ? Array.from(event.target.files) : [])
              }
            />
            <div className="text-muted">
              {t("forms.files_count", { value: files.length })}
            </div>
            {files.length > 0 ? (
              <div className="list">
                {files.map((file) => (
                  <span key={`${doc.id}-${file.name}`}>{file.name}</span>
                ))}
              </div>
            ) : null}
            {errorKey ? <div className="form-error">{t(errorKey)}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
