import { Injectable } from "@nestjs/common";

/**
 * Simulates ERP acceptance for generic integration tests.
 */
@Injectable()
export class ErpMockAcceptanceService {
  accept(payload: Record<string, unknown>): Record<string, unknown> {
    const referenceId = `ERP-MOCK-${Date.now()}`;
    return {
      status: "accepted",
      referenceId,
      acceptedAt: new Date().toISOString(),
      payloadSummary: summarizePayload(payload)
    };
  }
}

function summarizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const keys = Object.keys(payload).slice(0, 24);
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = payload[k];
    if (v != null && typeof v === "object") {
      out[k] = Array.isArray(v) ? `[array:${(v as unknown[]).length}]` : "[object]";
    } else {
      out[k] = v;
    }
  }
  return out;
}
