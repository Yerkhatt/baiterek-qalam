import { FormSchema, ServiceMetadata } from "@qalam/form-engine";
import { apiFetch, type ApiError } from "@/lib/api";

function schemaPath(serviceId: string, suffix = ""): string {
  return `/schemas/${encodeURIComponent(serviceId)}${suffix}`;
}

export type SchemaSummary = {
  serviceId: string;
  latestVersion: number;
  status: "draft" | "published" | "archived";
  updatedAt: string;
  metadata?: ServiceMetadata;
};

export async function fetchSchemas(): Promise<SchemaSummary[]> {
  return apiFetch<SchemaSummary[]>("/schemas", { cache: "no-store" });
}

/** Public site catalog: latest published version per service (draft-only services omitted). */
export async function fetchPublishedCatalog(): Promise<SchemaSummary[]> {
  try {
    return await apiFetch<SchemaSummary[]>("/schemas/catalog/published", { cache: "no-store" });
  } catch (err) {
    const status = (err as ApiError).status;
    if (status === 404) {
      const legacy = await apiFetch<SchemaSummary[]>("/schemas", { cache: "no-store" });
      return legacy.filter((row) => row.status === "published");
    }
    throw err;
  }
}

export async function fetchSchema(serviceId: string): Promise<FormSchema | null> {
  try {
    return await apiFetch<FormSchema>(schemaPath(serviceId), { cache: "no-store" });
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchSchemaVersion(serviceId: string, version: number): Promise<FormSchema | null> {
  try {
    return await apiFetch<FormSchema>(`${schemaPath(serviceId)}?version=${version}`, { cache: "no-store" });
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      return null;
    }
    throw error;
  }
}

export async function saveSchema(serviceId: string, schema: FormSchema): Promise<void> {
  await apiFetch(schemaPath(serviceId), {
    method: "PUT",
    body: JSON.stringify({ schema })
  });
}

export async function renameSchema(fromServiceId: string, targetServiceId: string): Promise<void> {
  await apiFetch(schemaPath(fromServiceId, "/rename"), {
    method: "PATCH",
    body: JSON.stringify({ targetServiceId })
  });
}

export async function publishSchema(serviceId: string): Promise<{ ok: boolean; version: number }> {
  return apiFetch<{ ok: boolean; version: number }>(schemaPath(serviceId, "/publish"), {
    method: "POST"
  });
}

export async function deleteSchema(serviceId: string): Promise<void> {
  await apiFetch<{ ok: true }>(schemaPath(serviceId), {
    method: "DELETE"
  });
}
