declare module '@qalam/form-engine' {
  export type FormSchema = Record<string, unknown>;
  export type RuntimeState = {
    values?: Record<string, unknown>;
    integrationResults?: Record<string, { success: boolean; data?: unknown; error?: string }>;
    [key: string]: unknown;
  };
  export type FormNode = Record<string, unknown> & {
    execution?: {
      timeoutMs?: number;
      retryCount?: number;
      retryDelayMs?: number;
      continueOnError?: boolean;
    };
  };
  export type IntegrationCall = {
    id: string;
    adapter: string;
    url?: string;
    headers?: Record<string, string>;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    payload_map: Record<string, unknown>;
    response_map?: Record<string, string>;
    store_as?: string;
    continue_on_error?: boolean;
  };
  export type IntegrationAdapterRequest = {
    node: FormNode;
    integration: IntegrationCall;
    state: RuntimeState;
    context: Record<string, unknown>;
  };
  export type IntegrationAdapterResponse = {
    success: boolean;
    statusCode?: number;
    data?: unknown;
    error?: string;
  };
  export interface IntegrationExecutor {
    execute(request: IntegrationAdapterRequest): Promise<IntegrationAdapterResponse>;
  }
  export interface RuleEvent {
    name: string;
    payload?: unknown;
  }
  export interface EvaluationResult {
    state: RuntimeState;
    nextNodeId?: string;
    events: RuleEvent[];
  }
  export function validateSchema(schema: FormSchema): { valid: boolean; errors: string[] };
  export function migrateSchema(schema: FormSchema): FormSchema;
  export function evaluateNode(
    schema: FormSchema,
    state: RuntimeState,
    nodeId: string
  ): EvaluationResult;
  export function evaluateNodeWithExecutor(
    schema: FormSchema,
    state: RuntimeState,
    nodeId: string,
    executor?: IntegrationExecutor
  ): Promise<EvaluationResult>;
  export function materializeIntegrationPayload(
    payloadMap: Record<string, unknown>,
    ctx: Record<string, unknown>
  ): Record<string, unknown>;
}
