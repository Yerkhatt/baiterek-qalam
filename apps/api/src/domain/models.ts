import type { RuleEvent, RuntimeState } from "@qalam/form-engine";

export type ServiceMetadataRecord = {
  title: string;
  visitorBriefing?: string;
  summary?: string;
  description?: string;
  owner?: string;
  whoFor?: string;
  timeline?: string;
  category?: string;
  tag?: string;
  stage?: string;
  requirements?: string[];
  documents?: string[];
  stages?: Array<{
    title: string;
    desc: string;
    status: string;
    statusTone?: "draft" | "review" | "success" | "wait";
  }>;
};

export type ApplicationRecord = {
  id: string;
  serviceId: string;
  schemaVersion: number;
  status: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
};

export type FormVersionStatus = "draft" | "published" | "archived";

export type FormVersionRecord = {
  id: string;
  serviceId: string;
  version: number;
  status: FormVersionStatus;
  schema: unknown;
  createdAt: string;
  updatedAt: string;
};

export type SchemaSummaryRecord = {
  serviceId: string;
  latestVersion: number;
  status: FormVersionStatus;
  updatedAt: string;
  metadata?: ServiceMetadataRecord;
};

export type RuntimeSnapshot = {
  appId: string;
  nodeId: string;
  history: string[];
  state: RuntimeState;
  events: RuleEvent[];
  updatedAt: string;
};

export type EventStats = {
  total: number;
  counts: Record<string, number>;
};
