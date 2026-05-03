"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import type { FormNode, FormSchema, ServiceMetadata, ServiceStageTone } from "@qalam/form-engine";
import type { GraphIssue } from "@/lib/form-builder/graph";
import { applyAutoLayout, validateGraphStructure, withSyncedEdges } from "@/lib/form-builder/graph";
import { formatGraphIssue, graphIssueFocusNodeId } from "@/lib/form-builder/graphIssueMessages";
import { formatApiError } from "@/lib/errorMessage";
import { decodeServiceIdParam } from "@/lib/serviceIdCodec";
import { fetchSchema, publishSchema, renameSchema, saveSchema } from "@/lib/schemaApi";
import { getConstructorNodeTitle } from "@/lib/constructor/nodeLabels";
import FormRuntime from "@/components/FormRuntime";
import { ConstructorCanvas } from "./ConstructorCanvas";
import { ConstructorInspector } from "./ConstructorInspector";
import { ConstructorMetadataScreen } from "./ConstructorMetadataScreen";
import { ConstructorToolbar } from "./ConstructorToolbar";

function metadataReadyForPublish(schema: FormSchema): boolean {
  return (schema.metadata?.visitorBriefing ?? "").trim().length > 0;
}

/** Avoid SSR/hydration for React Flow — mount after first paint on the client. */
function CanvasPlaceholder() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: 14 }}>
      Загрузка холста…
    </div>
  );
}

const DEFAULT_SCHEMA: FormSchema = {
  schemaVersion: 1,
  start: "start",
  nodes: [
    { id: "start", type: "start", next: "end", position: { x: 120, y: 180 } },
    { id: "end",   type: "end",                position: { x: 500, y: 180 } }
  ]
};

const MAX_UNDO = 50;

const DEFAULT_STAGE_TONE: ServiceStageTone = "draft";
const GRAPH_WARNING_KEYS = new Set<string>([
  "forms.graph_end_recommended",
  "forms.graph_node_unreachable",
  "forms.graph_node_dead_end",
  "forms.graph_path_without_integration"
]);

function splitGraphIssues(issues: GraphIssue[]): { blocking: GraphIssue[]; warnings: GraphIssue[] } {
  const blocking: GraphIssue[] = [];
  const warnings: GraphIssue[] = [];
  for (const issue of issues) {
    if (GRAPH_WARNING_KEYS.has(issue.messageKey)) {
      warnings.push(issue);
    } else {
      blocking.push(issue);
    }
  }
  return { blocking, warnings };
}

type AuthoringIssue = {
  code: string;
  message: string;
};

function collectAuthoringIssues(schema: FormSchema): AuthoringIssue[] {
  const issues: AuthoringIssue[] = [];
  for (const node of schema.nodes) {
    if (node.type === "step") {
      for (const field of node.fields ?? []) {
        if (!(field.label_key ?? "").trim()) {
          issues.push({
            code: `step:${node.id}:field:${field.id}:label`,
            message: "Заполните названия вопросов/вариантов"
          });
        }
        if ((field.type === "select" || field.type === "radio") && Array.isArray(field.options)) {
          for (const option of field.options) {
            if (!(option.label_key ?? "").trim()) {
              issues.push({
                code: `step:${node.id}:field:${field.id}:option:${String(option.value)}:label`,
                message: "Заполните названия вопросов/вариантов"
              });
            }
          }
        }
      }
    }
    if (node.type === "document_request") {
      for (const doc of node.documents ?? []) {
        if (!(doc.label_key ?? "").trim()) {
          issues.push({
            code: `doc:${node.id}:${doc.id}:label`,
            message: "Заполните названия вопросов/вариантов"
          });
        }
      }
    }
    if (node.type === "switch") {
      const isRulesMode = node.switch?.mode !== "expression";
      const sourceFieldId = node.switch?.sourceFieldId?.trim() ?? "";
      if (isRulesMode && !sourceFieldId) {
        issues.push({
          code: `switch:${node.id}:source`,
          message: `Switch «${getConstructorNodeTitle(node)}»: выберите поле-источник перед публикацией`
        });
      }
      const routeCount = Array.isArray(node.switch?.routes) ? node.switch.routes.length : 0;
      if (isRulesMode && routeCount === 0) {
        issues.push({
          code: `switch:${node.id}:routes`,
          message: `Switch «${getConstructorNodeTitle(node)}»: добавьте минимум одну ветку перед публикацией`
        });
      }
    }
  }
  return issues;
}

function withDefaultMetadata(schema: FormSchema, serviceId: string): FormSchema {
  const fallbackTitle = serviceId.trim() || "Новая услуга";
  const rawTitle = schema.metadata?.title?.trim() ?? "";
  const title =
    rawTitle.length > 0 &&
    fallbackTitle.length > 0 &&
    rawTitle.toLowerCase() === "test" &&
    fallbackTitle.toLowerCase() !== "test"
      ? fallbackTitle
      : rawTitle || fallbackTitle;
  const metadata: ServiceMetadata = {
    title,
    visitorBriefing: schema.metadata?.visitorBriefing ?? "",
    summary: schema.metadata?.summary ?? "",
    description: schema.metadata?.description ?? "",
    owner: schema.metadata?.owner ?? "",
    whoFor: schema.metadata?.whoFor ?? "",
    timeline: schema.metadata?.timeline ?? "",
    category: schema.metadata?.category ?? "",
    tag: schema.metadata?.tag ?? "",
    stage: schema.metadata?.stage ?? "",
    requirements: schema.metadata?.requirements ?? [],
    documents: schema.metadata?.documents ?? [],
    stages: (schema.metadata?.stages ?? []).map((stage) => ({
      title: stage.title ?? "",
      desc: stage.desc ?? "",
      status: stage.status ?? "",
      statusTone: stage.statusTone ?? DEFAULT_STAGE_TONE
    }))
  };
  return {
    ...schema,
    metadata
  };
}

function sanitizeDraftSchema(schema: FormSchema, serviceId: string): FormSchema {
  if (!schema.metadata) {
    return schema;
  }
  const fallbackTitle = serviceId.trim() || "Новая услуга";
  const rawTitle = schema.metadata.title?.trim() ?? "";
  const title =
    rawTitle.length > 0 &&
    fallbackTitle.length > 0 &&
    rawTitle.toLowerCase() === "test" &&
    fallbackTitle.toLowerCase() !== "test"
      ? fallbackTitle
      : rawTitle || fallbackTitle;
  return {
    ...schema,
    metadata: {
      ...schema.metadata,
      title
    }
  };
}

type ConstructorProps = {
  initialServiceId?: string;
};

export default function Constructor({ initialServiceId }: ConstructorProps) {
  const router = useRouter();
  /** Canonical slug from route once opened under `/constructor/[id]`; null on `/constructor/new` until first save. */
  const originalSlugRef = useRef<string | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [schema, setSchema] = useState<FormSchema>(() => withSyncedEdges(DEFAULT_SCHEMA));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [metadataScreenOpen, setMetadataScreenOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // ── Schema commit (supports undo/redo) ───────────────────────────────────
  const commit = useCallback((updater: (prev: FormSchema) => FormSchema) => {
    setSchema((prev) => {
      setUndoStack((s) => [...s.slice(-(MAX_UNDO - 1)), JSON.stringify(prev)]);
      setRedoStack([]);
      return withSyncedEdges(updater(prev));
    });
  }, []);

  const updateMetadata = useCallback(
    (patch: Partial<ServiceMetadata>) => {
      commit((prev) => ({
        ...prev,
        metadata: {
          ...(prev.metadata ?? { title: serviceId.trim() || "Новая услуга" }),
          ...patch
        }
      }));
    },
    [commit, serviceId]
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (!stack.length) return stack;
      const snap = stack[stack.length - 1];
      setInspectorOpen(false);
      setSchema((cur) => {
        setRedoStack((r) => [...r.slice(-(MAX_UNDO - 1)), JSON.stringify(cur)]);
        return withSyncedEdges(JSON.parse(snap) as FormSchema);
      });
      return stack.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (!stack.length) return stack;
      const snap = stack[stack.length - 1];
      setInspectorOpen(false);
      setSchema((cur) => {
        setUndoStack((u) => [...u.slice(-(MAX_UNDO - 1)), JSON.stringify(cur)]);
        return withSyncedEdges(JSON.parse(snap) as FormSchema);
      });
      return stack.slice(0, -1);
    });
  }, []);

  // ── Update the selected node from inspector ──────────────────────────────
  const updateSelectedNode = useCallback(
    (updates: Partial<FormNode>) => {
      if (!selectedId) return;
      commit((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === selectedId ? { ...n, ...updates } : n))
      }));
    },
    [selectedId, commit]
  );

  const removeSelectedNode = useCallback(() => {
    if (!selectedId) return;
    commit((prev) => {
      const remaining = prev.nodes.filter((n) => n.id !== selectedId);
      if (!remaining.length) return prev;
      return withSyncedEdges({
        ...prev,
        nodes: remaining,
        edges: (prev.edges ?? []).filter((edge) => edge.from !== selectedId && edge.to !== selectedId),
        start: prev.start === selectedId ? remaining[0].id : prev.start
      });
    });
    setInspectorOpen(false);
    setSelectedId(null);
  }, [selectedId, commit]);

  /** Writes current canvas schema to API (draft). Used by Save and at the start of Publish so work is not lost when publish is blocked. */
  const persistDraftToServer = useCallback(
    async (slug: string): Promise<boolean> => {
      try {
        const origin = originalSlugRef.current;
        let syncRoute = false;
        if (origin !== null && origin !== slug) {
          await renameSchema(origin, slug);
          originalSlugRef.current = slug;
          syncRoute = true;
        }
        await saveSchema(slug, sanitizeDraftSchema(schema, slug));
        if (originalSlugRef.current === null) {
          originalSlugRef.current = slug;
          syncRoute = true;
        }
        if (syncRoute) {
          router.replace(`/admin/constructor/${encodeURIComponent(slug)}`);
        }
        return true;
      } catch (error) {
        setStatus(`Сохранение не удалось: ${formatApiError(error, "ошибка сервера")}`);
        return false;
      }
    },
    [schema, router]
  );

  // ── Load / save / publish ────────────────────────────────────────────────
  async function loadSchema() {
    if (!serviceId.trim()) return;
    const decoded = decodeServiceIdParam(serviceId.trim());
    if (decoded !== serviceId) {
      setServiceId(decoded);
    }
    try {
      setStatus("Загрузка...");
      const loaded = await fetchSchema(decoded);
      if (!loaded) { setStatus("Не найдено — начат новый сценарий"); return; }
      setSchema(withSyncedEdges(withDefaultMetadata(loaded, decoded)));
      setSelectedId(null);
      setInspectorOpen(false);
      setUndoStack([]);
      setRedoStack([]);
      setStatus("Загружено");
      setTimeout(() => setStatus(null), 2000);
    } catch (error) { setStatus(formatApiError(error, "Ошибка загрузки")); }
  }

  useEffect(() => {
    if (!initialServiceId?.trim()) {
      return;
    }
    const decoded = decodeServiceIdParam(initialServiceId.trim());
    originalSlugRef.current = decoded;
    setServiceId(decoded);
    setStatus("Загрузка...");
    void fetchSchema(decoded)
      .then((loaded) => {
        if (!loaded) {
          setStatus("Не найдено — начат новый сценарий");
          return;
        }
        setSchema(withSyncedEdges(withDefaultMetadata(loaded, decoded)));
        setSelectedId(null);
        setInspectorOpen(false);
        setUndoStack([]);
        setRedoStack([]);
        setStatus("Загружено");
        setTimeout(() => setStatus(null), 2000);
      })
      .catch((error) => setStatus(formatApiError(error, "Ошибка загрузки")));
  }, [initialServiceId]);

  async function saveCurrentSchema() {
    if (!serviceId.trim()) {
      setStatus("Укажите название услуги");
      return;
    }
    const slug = decodeServiceIdParam(serviceId.trim());
    if (slug !== serviceId) {
      setServiceId(slug);
    }
    const authoringIssues = collectAuthoringIssues(schema);
    const graphIssues = validateGraphStructure(schema);
    const { blocking, warnings } = splitGraphIssues(graphIssues);
    const totalIssues = authoringIssues.length + blocking.length + warnings.length;
    setStatus("Сохранение...");
    const ok = await persistDraftToServer(slug);
    if (!ok) {
      return;
    }
    if (totalIssues > 0) {
      setStatus(`Сохранено как черновик · замечаний: ${totalIssues}`);
    } else {
      setStatus("Сохранено");
    }
    setTimeout(() => setStatus(null), 2000);
  }

  async function publishCurrentSchema() {
    if (!serviceId.trim()) return;
    const slug = decodeServiceIdParam(serviceId.trim());
    if (slug !== serviceId) {
      setServiceId(slug);
    }

    setStatus("Сохранение черновика…");
    const persisted = await persistDraftToServer(slug);
    if (!persisted) {
      return;
    }

    if (!metadataReadyForPublish(schema)) {
      setStatus(
        "Черновик сохранён на сервере. Для публикации заполните текст в «Информация для посетителя» (кнопка «Метаданные»)."
      );
      setMetadataScreenOpen(true);
      return;
    }
    const authoringIssues = collectAuthoringIssues(schema);
    if (authoringIssues.length > 0) {
      setStatus(
        `Черновик сохранён. Публикация: заполните названия вопросов/вариантов (${authoringIssues.length}).`
      );
      return;
    }
    const graphIssues = validateGraphStructure(schema);
    const { blocking, warnings } = splitGraphIssues(graphIssues);
    if (blocking.length > 0) {
      const firstLine = formatGraphIssue(blocking[0], schema);
      const more = blocking.length > 1 ? ` (+${blocking.length - 1} ещё)` : "";
      setStatus(`Черновик сохранён. Публикация заблокирована: ${firstLine}${more}`);
      const focusId = graphIssueFocusNodeId(blocking[0]);
      if (focusId) {
        setSelectedId(focusId);
        setInspectorOpen(true);
      }
      return;
    }
    try {
      setStatus("Публикация…");
      await publishSchema(slug);
      if (warnings.length > 0) {
        setStatus(`Опубликовано с предупреждениями (${warnings.length})`);
      } else {
        setStatus("Опубликовано ✓");
      }
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus(formatApiError(error, "Ошибка публикации"));
    }
  }

  const selectedNode = useMemo(
    () => (selectedId ? schema.nodes.find((n) => n.id === selectedId) ?? null : null),
    [schema.nodes, selectedId]
  );

  const metadataReady = useMemo(() => metadataReadyForPublish(schema), [schema]);
  const authoringIssueCount = useMemo(() => collectAuthoringIssues(schema).length, [schema]);
  const graphWarningCount = useMemo(() => {
    const graphIssues = validateGraphStructure(schema);
    return splitGraphIssues(graphIssues).warnings.length;
  }, [schema]);

  const autoLayout = useCallback(() => {
    commit((prev) => applyAutoLayout(prev));
  }, [commit]);

  useEffect(() => {
    const isEditableTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      return Boolean(el.closest("[contenteditable='true']"));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      if (isEditableTarget(e.target)) return;
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [undo, redo]);

  useEffect(() => {
    setCanvasReady(true);
  }, []);

  return (
    <div className="cshell">
      <ConstructorToolbar
        serviceId={serviceId}
        hasChanges={undoStack.length > 0}
        canPublish={Boolean(serviceId.trim()) && metadataReady && authoringIssueCount === 0}
        metadataReady={metadataReady}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        status={status}
        graphWarningCount={graphWarningCount}
        authoringIssueCount={authoringIssueCount}
        onServiceIdChange={setServiceId}
        onLoad={loadSchema}
        onSave={saveCurrentSchema}
        onPublish={publishCurrentSchema}
        onPreview={() => setPreviewOpen(true)}
        onOpenMetadata={() => setMetadataScreenOpen(true)}
        onUndo={undo}
        onRedo={redo}
        onBack={() => router.push("/admin/constructor")}
      />

      <div className="cshell-main">
        <div className="cworkspace">
          <ReactFlowProvider>
            {canvasReady ? (
              <ConstructorCanvas
                schema={schema}
                onNodeSelect={setSelectedId}
                onSchemaChange={commit}
                onAutoLayout={autoLayout}
                onOpenInspector={() => setInspectorOpen(true)}
              />
            ) : (
              <CanvasPlaceholder />
            )}
          </ReactFlowProvider>

          {metadataScreenOpen && (
            <ConstructorMetadataScreen
              schema={schema}
              onChange={updateMetadata}
              onClose={() => setMetadataScreenOpen(false)}
            />
          )}

          {inspectorOpen && selectedNode && (
          <div className="cinsp-overlay">
            <button
              type="button"
              className="cinsp-backdrop"
              aria-label="Закрыть"
              onClick={() => setInspectorOpen(false)}
            />
            <div
              className="cinsp-modal-wrap"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cinsp-dialog-title"
              onClick={(ev) => ev.stopPropagation()}
            >
              <ConstructorInspector
                node={selectedNode}
                schema={schema}
                onUpdate={updateSelectedNode}
                onSchemaUpdate={commit}
                onRemove={removeSelectedNode}
                onClose={() => setInspectorOpen(false)}
              />
            </div>
          </div>
          )}

          {previewOpen && (
          <div className="cpreview-overlay" onClick={() => setPreviewOpen(false)}>
            <div
              className="cpreview-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="constructor-preview-title"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="cpreview-head">
                <span id="constructor-preview-title">
                  Предпросмотр: {schema.metadata?.title?.trim() || serviceId.trim() || "Новая услуга"}
                </span>
                <button
                  type="button"
                  className="cpreview-close"
                  aria-label="Закрыть предпросмотр"
                  onClick={() => setPreviewOpen(false)}
                >
                  ✕
                </button>
              </div>
              <div className="cpreview-body">
                <FormRuntime appId="constructor-preview" schema={schema} previewMode />
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
