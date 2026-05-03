import { Injectable } from "@nestjs/common";
import {
  IntegrationAdapterRequest,
  IntegrationAdapterResponse,
  IntegrationExecutor,
  materializeIntegrationPayload
} from "@qalam/form-engine";
import { ErpMockAcceptanceService } from "./erp-mock.service";

const INTERNAL_FETCH_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.INTEGRATION_HTTP_TIMEOUT_MS ?? 15000), 1000),
  120_000
);

const MIN_NODE_TIMEOUT_MS = 1000;
const MAX_NODE_TIMEOUT_MS = 120_000;
const MAX_RETRY_ATTEMPTS = 8;
const MAX_RETRY_DELAY_MS = 60_000;

@Injectable()
export class FormIntegrationExecutor implements IntegrationExecutor {
  constructor(private readonly erpMockAcceptance: ErpMockAcceptanceService) {}

  async execute(request: IntegrationAdapterRequest): Promise<IntegrationAdapterResponse> {
    const integ = request.integration;
    const url = (integ.url ?? "").trim();

    if (this.isMockSignPath(url)) {
      materializeIntegrationPayload(integ.payload_map ?? {}, request.context);
      return {
        success: true,
        statusCode: 200,
        data: { signed: true, mocked: true }
      };
    }

    if (this.isMockErpDemoPath(url)) {
      const payload = materializeIntegrationPayload(integ.payload_map ?? {}, request.context);
      const data = this.erpMockAcceptance.accept(payload);
      return {
        success: true,
        statusCode: 201,
        data
      };
    }

    if (integ.adapter?.toLowerCase().includes("fail")) {
      return {
        success: false,
        statusCode: 502,
        error: "integration.mock.failure"
      };
    }

    const resolved = this.resolveOutboundUrl(url);
    if (!resolved.ok) {
      return {
        success: false,
        statusCode: 400,
        error: resolved.error
      };
    }

    const method = (integ.method ?? "POST").toUpperCase();
    const payload = materializeIntegrationPayload(integ.payload_map ?? {}, request.context);
    const headers: Record<string, string> = {
      ...(integ.headers ?? {})
    };

    const init: RequestInit = { method };

    if (method !== "GET" && method !== "HEAD") {
      if (!headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/json";
      }
      init.body = JSON.stringify(payload);
    }

    if (Object.keys(headers).length > 0) {
      init.headers = headers;
    }

    const timeoutMs = this.resolveTimeoutMs(request);
    const maxRetries = Math.min(
      Math.max(Math.floor(request.node.execution?.retryCount ?? 0), 0),
      MAX_RETRY_ATTEMPTS
    );
    const retryDelayMs = Math.min(
      Math.max(Math.floor(request.node.execution?.retryDelayMs ?? 500), 0),
      MAX_RETRY_DELAY_MS
    );

    let last: {
      ok: boolean;
      status: number;
      data?: unknown;
      error?: string;
      networkError?: string;
    } = { ok: false, status: 502, error: "integration.http.failed" };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      last = await this.fetchOutboundOnce(resolved.url, init, timeoutMs);
      if (last.ok) {
        return {
          success: true,
          statusCode: last.status,
          data: last.data
        };
      }
      if (attempt === maxRetries) {
        break;
      }
      const retriable =
        last.networkError != null || (last.status > 0 && this.shouldRetryHttp(last.status));
      if (!retriable) {
        break;
      }
      if (retryDelayMs > 0) {
        await this.delay(retryDelayMs);
      }
    }

    if (last.networkError) {
      return {
        success: false,
        statusCode: 502,
        error: last.networkError
      };
    }
    return {
      success: false,
      statusCode: last.status,
      error: last.error ?? `integration.http.${last.status}`,
      data: last.data
    };
  }

  private resolveTimeoutMs(request: IntegrationAdapterRequest): number {
    const fromNode = request.node.execution?.timeoutMs;
    if (fromNode == null || !Number.isFinite(fromNode)) {
      return INTERNAL_FETCH_TIMEOUT_MS;
    }
    return Math.min(Math.max(Math.floor(fromNode), MIN_NODE_TIMEOUT_MS), MAX_NODE_TIMEOUT_MS);
  }

  private shouldRetryHttp(status: number): boolean {
    return status === 429 || status === 502 || status === 503 || status === 504;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchOutboundOnce(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<{
    ok: boolean;
    status: number;
    data?: unknown;
    error?: string;
    networkError?: string;
  }> {
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal });
      const text = await res.text();
      let data: unknown = text;
      try {
        data = text.length ? JSON.parse(text) : null;
      } catch {
        /* keep raw text */
      }
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: `integration.http.${res.status}`,
          data
        };
      }
      return {
        ok: true,
        status: res.status,
        data
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "integration.http.failed";
      return {
        ok: false,
        status: 502,
        networkError: message
      };
    }
  }

  /** In-process mock signature provider — no outbound HTTP. */
  private isMockSignPath(url: string): boolean {
    const paths = ["/api/erp/mock-sign"];
    return paths.some((p) => url === p || url.endsWith(p));
  }

  /** In-process mock ERP: no outbound HTTP; matches MVP `mock-leasing` and legacy `mock-acceptance`. */
  private isMockErpDemoPath(url: string): boolean {
    const paths = ["/api/erp/mock-leasing", "/api/erp/mock-acceptance"];
    return paths.some((p) => url === p || url.endsWith(p));
  }

  private resolveOutboundUrl(url: string): { ok: true; url: string } | { ok: false; error: string } {
    if (!url) {
      return { ok: false, error: "integration.url.missing" };
    }

    if (url.startsWith("/")) {
      const base = (process.env.API_SELF_ORIGIN ?? "http://127.0.0.1:2745").replace(/\/$/, "");
      return { ok: true, url: `${base}${url}` };
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ok: false, error: "integration.url.invalid" };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "integration.url.scheme_not_allowed" };
    }

    const allowed = (process.env.INTEGRATION_HTTP_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);

    if (allowed.length === 0) {
      return { ok: false, error: "integration.url.host_not_allowlisted" };
    }

    const host = parsed.hostname.toLowerCase();
    if (!allowed.includes(host)) {
      return { ok: false, error: "integration.url.host_not_allowlisted" };
    }

    return { ok: true, url: parsed.toString() };
  }
}
