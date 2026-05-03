import type { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";

type ErrorPayload = {
  message?: unknown;
  errors?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function decodeEngineError(code: string): string {
  const [base, detail = ""] = code.split(":", 2);
  const key = `forms.engine_errors.${base}`;
  const translated = t(key, { detail });
  if (translated !== key) {
    return translated;
  }
  if (detail) {
    return `${base}: ${detail}`;
  }
  return base;
}

function decodePayloadMessage(message: string): string {
  const decoded = decodeEngineError(message);
  if (decoded !== message) {
    return decoded;
  }
  if (message.startsWith("api.error:")) {
    const status = message.split(":")[1] ?? "";
    const key = `forms.api_status.${status}`;
    const translated = t(key);
    return translated !== key ? translated : t("forms.api_error");
  }
  return message;
}

export function formatApiError(error: unknown, fallback = t("forms.api_error")): string {
  if (!error) {
    return fallback;
  }
  const apiError = error as ApiError;
  const payload: ErrorPayload | null = isRecord(apiError.payload) ? (apiError.payload as ErrorPayload) : null;
  if (payload) {
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      return payload.errors
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((code) => decodeEngineError(code))
        .join("; ");
    }
    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return decodePayloadMessage(payload.message);
    }
  }
  if (typeof apiError.message === "string" && apiError.message.trim().length > 0) {
    return decodePayloadMessage(apiError.message);
  }
  return fallback;
}
