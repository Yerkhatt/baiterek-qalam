export type ScenarioDeleteFlowDeps = {
  confirm: (message: string) => boolean;
  remove: (serviceId: string) => Promise<void>;
  refresh: () => void;
  success: (message: string) => void;
  failure: (message: string) => void;
  toErrorMessage: (error: unknown) => string;
};

export async function runScenarioDeleteFlow(
  serviceId: string,
  deps: ScenarioDeleteFlowDeps,
  labels: {
    confirmText: string;
    successText: string;
  }
): Promise<boolean> {
  if (!deps.confirm(labels.confirmText)) {
    return false;
  }
  try {
    await deps.remove(serviceId);
    deps.refresh();
    deps.success(labels.successText);
    return true;
  } catch (error) {
    deps.failure(deps.toErrorMessage(error));
    return false;
  }
}
