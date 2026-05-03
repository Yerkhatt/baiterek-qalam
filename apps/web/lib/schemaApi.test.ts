import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteSchema, fetchPublishedCatalog, renameSchema } from "./schemaApi";
import { apiFetch, type ApiError } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn()
}));

describe("schemaApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls DELETE /schemas/:serviceId", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true } as never);

    await deleteSchema("test");

    expect(apiFetch).toHaveBeenCalledWith("/schemas/test", {
      method: "DELETE"
    });
  });

  it("encodes serviceId in paths", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true } as never);

    await deleteSchema("a/b");

    expect(apiFetch).toHaveBeenCalledWith("/schemas/a%2Fb", {
      method: "DELETE"
    });
  });

  it("calls GET /schemas/catalog/published for public catalog", async () => {
    vi.mocked(apiFetch).mockResolvedValue([] as never);

    await fetchPublishedCatalog();

    expect(apiFetch).toHaveBeenCalledWith("/schemas/catalog/published", { cache: "no-store" });
  });

  it("falls back to GET /schemas when catalog route returns 404", async () => {
    const notFound = new Error("api.error:404") as ApiError;
    notFound.status = 404;
    vi.mocked(apiFetch)
      .mockRejectedValueOnce(notFound)
      .mockResolvedValueOnce([
        { serviceId: "draft-tip", latestVersion: 3, status: "draft", updatedAt: "2026-01-01" },
        { serviceId: "pub", latestVersion: 1, status: "published", updatedAt: "2026-01-02" }
      ] as never);

    const rows = await fetchPublishedCatalog();

    expect(apiFetch).toHaveBeenNthCalledWith(1, "/schemas/catalog/published", { cache: "no-store" });
    expect(apiFetch).toHaveBeenNthCalledWith(2, "/schemas", { cache: "no-store" });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.serviceId).toBe("pub");
  });

  it("calls PATCH rename", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true } as never);

    await renameSchema("old_id", "new_id");

    expect(apiFetch).toHaveBeenCalledWith("/schemas/old_id/rename", {
      method: "PATCH",
      body: JSON.stringify({ targetServiceId: "new_id" })
    });
  });
});
