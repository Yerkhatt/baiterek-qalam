export type NodeType =
  | "start"
  | "step"
  | "branch"
  | "switch"
  | "validation_gate"
  | "calculation"
  | "document_request"
  | "integration_call"
  | "approval"
  | "sign"
  | "end";

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "radio"
  | "file"
  | "table"
  | "group"
  | "repeat";

export interface DictionaryEntry {
  value: string | number;
  label_key: string;
}

export interface FormSchema {
  schemaVersion: number;
  start: string;
  nodes: FormNode[];
  edges?: FormEdge[];
  dictionaries?: Record<string, DictionaryEntry[]>;
  metadata?: ServiceMetadata;
}

export type ServiceStageTone = "draft" | "review" | "success" | "wait";

export interface ServiceStageMetadata {
  title: string;
  desc: string;
  status: string;
  statusTone?: ServiceStageTone;
}

export interface ServiceMetadata {
  title: string;
  /** Free text shown to visitors before they open the application form. */
  visitorBriefing?: string;
  summary?: string;
  description?: string;
  owner?: string;
  whoFor?: string;
  timeline?: string;
  category?: string;
  tag?: string;
  stage?: string;
  requirements?: string[];
  documents?: string[];
  stages?: ServiceStageMetadata[];
}

export interface FormNode {
  id: string;
  type: NodeType;
  title_key?: string;
  next?: string | string[];
  position?: CanvasPosition;
  fields?: FormField[];
  rules?: Rule[];
  switch?: SwitchConfig;
  documents?: DocumentRequest[];
  integration?: IntegrationCall;
  execution?: ExecutionPolicy;
}

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface FormEdge {
  id: string;
  from: string;
  to: string;
  fromPort?: string;
  toPort?: string;
  label_key?: string;
  condition?: unknown;
  priority?: number;
}

export interface FormField {
  id: string;
  label_key?: string;
  help_key?: string;
  type: FieldType;
  required?: boolean | string;
  validators?: Validator[];
  mask?: string;
  options?: FieldOption[] | string;
  default?: unknown;
  read_only?: boolean;
  multiline?: boolean;
  columns?: TableColumn[];
}

export interface FieldOption {
  value: string | number;
  label_key: string;
}

export interface TableColumn {
  id: string;
  label_key?: string;
  type: FieldType;
  required?: boolean | string;
  validators?: Validator[];
  mask?: string;
  options?: FieldOption[] | string;
  read_only?: boolean;
  calc?: unknown;
}

export interface Rule {
  id: string;
  when?: unknown;
  then: RuleAction[];
}

export type SwitchRouteValue = string | number | boolean;
export const SWITCH_EXTRA_OUTPUT_ID = "__switch_fallback__";

export interface SwitchRoute {
  id: string;
  label?: string;
  value: SwitchRouteValue;
}

export type SwitchFallback =
  | { mode: "none" }
  | { mode: "extra"; label?: string }
  | { mode: "existing"; routeId: string };

export interface SwitchConfig {
  mode: "rules" | "expression";
  sourceFieldId?: string;
  expression?: unknown;
  numberOutputs?: number;
  routes: SwitchRoute[];
  fallback?: SwitchFallback;
  allMatchingOutputs?: boolean;
}

export type RuleAction =
  | { type: "set_value"; path: string; value: unknown }
  | { type: "set_visible"; path: string; value: boolean }
  | { type: "set_required"; path: string; value: boolean }
  | { type: "set_error"; path: string; messageKey: string }
  | { type: "goto"; nodeId: string }
  | { type: "emit_event"; name: string; payload?: unknown };

export type Validator =
  | { type: "required" }
  | { type: "min"; value: number }
  | { type: "max"; value: number }
  | { type: "minLength"; value: number }
  | { type: "maxLength"; value: number }
  | { type: "regex"; value: string }
  | { type: "enum"; value: Array<string | number> }
  | { type: "dateRange"; value: { min?: string; max?: string } }
  | { type: "numberPrecision"; value: number }
  | {
      type: "file";
      value: { mime_types?: string[]; max_size_mb?: number; max_count?: number };
    };

export interface DocumentRequest {
  id: string;
  label_key: string;
  required?: boolean | string;
  file_types?: string[];
  max_size_mb?: number;
  max_count?: number;
  conditions?: unknown;
}

export interface IntegrationCall {
  id: string;
  adapter: string;
  url?: string;
  /** Static header names/values (no secrets — use server env + allowlist for auth). */
  headers?: Record<string, string>;
  payload_map: Record<string, unknown>;
  response_map?: Record<string, string>;
  store_as?: string;
  continue_on_error?: boolean;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
}

export interface ExecutionPolicy {
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  continueOnError?: boolean;
}

export interface FileMeta {
  name: string;
  mimeType?: string;
  sizeMb?: number;
}

export interface RuntimeState {
  applicationId?: string;
  formVersionId?: string;
  currentNodeId?: string;
  values: Record<string, unknown>;
  files?: Record<string, FileMeta[]>;
  errors?: Record<string, string>;
  visibility?: Record<string, boolean>;
  required?: Record<string, boolean>;
  stepStatus?: Record<string, "draft" | "complete" | "invalid">;
  integrationResults?: Record<string, IntegrationExecutionResult>;
  workflowErrors?: Record<string, string>;
}

export interface RuleEvent {
  name: string;
  payload?: unknown;
}

export interface EvaluationResult {
  state: RuntimeState;
  nextNodeId?: string;
  events: RuleEvent[];
  transitions?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface IntegrationExecutionResult {
  success: boolean;
  statusCode?: number;
  data?: unknown;
  error?: string;
}

export interface IntegrationAdapterRequest {
  node: FormNode;
  integration: IntegrationCall;
  state: RuntimeState;
  context: Record<string, unknown>;
}

export interface IntegrationAdapterResponse {
  success: boolean;
  statusCode?: number;
  data?: unknown;
  error?: string;
}

export interface IntegrationExecutor {
  execute(request: IntegrationAdapterRequest): Promise<IntegrationAdapterResponse>;
}
