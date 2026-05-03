const isServer = typeof window === "undefined";

export const API_BASE_URL = isServer
  ? (process.env.SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:2745")
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:2745");

export type ApiError = Error & {
  status?: number;
  payload?: unknown;
  rawBody?: string;
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const error = new Error(`api.error:${response.status}`) as ApiError;
    error.status = response.status;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      error.payload = await response.json().catch(() => null);
    } else {
      const body = await response.text().catch(() => "");
      if (body) {
        error.rawBody = body;
      }
    }
    throw error;
  }

  return response.json() as Promise<T>;
}
