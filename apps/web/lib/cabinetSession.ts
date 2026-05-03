export const PENDING_EGOV_SIGN_KEY = "qalam_pending_egov_sign";
export const CABINET_APPLICATIONS_KEY = "qalam_cabinet_applications";

export type PendingEgovSignPayload = {
  appId: string;
  serviceId: string;
  returnTo: string;
  serviceTitle: string;
};

export type CabinetApplicationEntry = {
  appId: string;
  serviceId: string;
  serviceTitle: string;
  submittedAt: string;
};

export function readCabinetApplications(): CabinetApplicationEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(CABINET_APPLICATIONS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (row): row is CabinetApplicationEntry =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as CabinetApplicationEntry).appId === "string"
    );
  } catch {
    return [];
  }
}

export function appendCabinetApplication(entry: CabinetApplicationEntry): void {
  if (typeof window === "undefined") {
    return;
  }
  const list = readCabinetApplications();
  list.unshift(entry);
  sessionStorage.setItem(CABINET_APPLICATIONS_KEY, JSON.stringify(list));
}
