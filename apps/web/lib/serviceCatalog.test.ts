import { describe, expect, it } from "vitest";
import { catalogCardTitle, resolveStaleDemoTitle } from "./serviceCatalog";
import type { SchemaSummary } from "./schemaApi";

function summary(partial: Partial<SchemaSummary>): SchemaSummary {
  return {
    serviceId: "x",
    latestVersion: 1,
    status: "published",
    updatedAt: "",
    ...partial
  };
}

describe("resolveStaleDemoTitle", () => {
  it("replaces primary test with fallback when they differ", () => {
    expect(resolveStaleDemoTitle("test", "Лизинг")).toBe("Лизинг");
  });

  it("returns primary when not test", () => {
    expect(resolveStaleDemoTitle("Лизинг МСП", "leasing-id")).toBe("Лизинг МСП");
  });

  it("returns fallback when primary empty", () => {
    expect(resolveStaleDemoTitle("", "Лизинг")).toBe("Лизинг");
  });
});

describe("catalogCardTitle", () => {
  it("uses metadata title when sensible", () => {
    expect(
      catalogCardTitle(
        summary({ serviceId: "leasing", metadata: { title: "Лизинг для бизнеса" } })
      )
    ).toBe("Лизинг для бизнеса");
  });

  it("falls back to serviceId when title missing", () => {
    expect(catalogCardTitle(summary({ serviceId: "Лизинг", metadata: { title: "" } }))).toBe("Лизинг");
  });

  it("replaces stray demo title test when serviceId is not test", () => {
    expect(catalogCardTitle(summary({ serviceId: "Лизинг", metadata: { title: "test" } }))).toBe("Лизинг");
  });

  it("keeps test when service id is test", () => {
    expect(catalogCardTitle(summary({ serviceId: "test", metadata: { title: "test" } }))).toBe("test");
  });
});
