"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/errorMessage";
import { t } from "@/lib/i18n";
import { runScenarioDeleteFlow } from "@/lib/admin/scenarioDeleteFlow";
import { deleteSchema } from "@/lib/schemaApi";

type Props = {
  serviceId: string;
  title: string;
  statusLabel: string;
  latestVersion: number;
  updatedLabel: string;
};

export default function ScenarioListItem({
  serviceId,
  title,
  statusLabel,
  latestVersion,
  updatedLabel
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (deleting) {
      return;
    }
    setDeleting(true);
    await runScenarioDeleteFlow(
      serviceId,
      {
        confirm: (message) => window.confirm(message),
        remove: deleteSchema,
        refresh: () => router.refresh(),
        success: (message) => window.alert(message),
        failure: (message) => window.alert(message),
        toErrorMessage: (error) => formatApiError(error)
      },
      {
        confirmText: t("admin.workflows_delete_confirm", { serviceId }),
        successText: t("admin.workflows_deleted", { serviceId })
      }
    );
    setDeleting(false);
  }

  return (
    <div className="card card--outline workflow-card" key={serviceId}>
      <div className="workflow-card-head">
        <div className="h3">{title}</div>
        <span className="badge badge--muted">{statusLabel}</span>
      </div>
      <div className="workflow-meta">
        <span>{t("admin.service_id_label")}: {serviceId}</span>
        <span>{t("admin.workflows_latest_version", { value: latestVersion })}</span>
        <span>{t("common.updated")}: {updatedLabel}</span>
      </div>
      <div className="workflow-actions">
        <Link className="button button--primary button--small" href={`/admin/constructor/${serviceId}`}>
          {t("admin.workflows_open_workflow")}
        </Link>
        <button
          type="button"
          className="button button--outline button--small"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "..." : t("admin.workflows_delete")}
        </button>
      </div>
    </div>
  );
}
