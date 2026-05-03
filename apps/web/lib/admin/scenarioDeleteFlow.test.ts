import { describe, expect, it, vi } from "vitest";
import { runScenarioDeleteFlow } from "./scenarioDeleteFlow";

describe("runScenarioDeleteFlow", () => {
  it("deletes and refreshes when confirmed", async () => {
    const deps = {
      confirm: vi.fn(() => true),
      remove: vi.fn(async () => undefined),
      refresh: vi.fn(),
      success: vi.fn(),
      failure: vi.fn(),
      toErrorMessage: vi.fn(() => "err")
    };

    const ok = await runScenarioDeleteFlow("test", deps, {
      confirmText: "confirm",
      successText: "done"
    });

    expect(ok).toBe(true);
    expect(deps.confirm).toHaveBeenCalledWith("confirm");
    expect(deps.remove).toHaveBeenCalledWith("test");
    expect(deps.refresh).toHaveBeenCalled();
    expect(deps.success).toHaveBeenCalledWith("done");
    expect(deps.failure).not.toHaveBeenCalled();
  });

  it("reports error when delete fails", async () => {
    const deps = {
      confirm: vi.fn(() => true),
      remove: vi.fn(async () => {
        throw new Error("boom");
      }),
      refresh: vi.fn(),
      success: vi.fn(),
      failure: vi.fn(),
      toErrorMessage: vi.fn(() => "delete failed")
    };

    const ok = await runScenarioDeleteFlow("test", deps, {
      confirmText: "confirm",
      successText: "done"
    });

    expect(ok).toBe(false);
    expect(deps.failure).toHaveBeenCalledWith("delete failed");
    expect(deps.refresh).not.toHaveBeenCalled();
  });
});
