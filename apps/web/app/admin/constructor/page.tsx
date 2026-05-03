import Link from "next/link";
import RailLayout from "@/components/RailLayout";
import ScenarioListItem from "@/components/admin/ScenarioListItem";
import SectionHeading from "@/components/SectionHeading";
import { getAdminNav } from "@/app/admin/nav";
import { t } from "@/lib/i18n";
import { fetchSchemas, type SchemaSummary } from "@/lib/schemaApi";

export const dynamic = "force-dynamic";

function getWorkflowTitle(serviceId: string): string {
  const titleKey = `services.${serviceId}.title`;
  const translated = t(titleKey);
  return translated === titleKey ? serviceId : translated;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("ru-RU");
}

function formatWorkflowStatus(status: SchemaSummary["status"]): string {
  switch (status) {
    case "published":
      return t("admin.workflow_status_published");
    case "archived":
      return t("admin.workflow_status_archived");
    case "draft":
    default:
      return t("admin.workflow_status_draft");
  }
}

export default async function AdminConstructorPage() {
  let workflows: SchemaSummary[] = [];
  let hasLoadError = false;
  try {
    workflows = await fetchSchemas();
  } catch {
    hasLoadError = true;
  }

  return (
    <RailLayout nav={getAdminNav()}>
      <div className="stack">
        <div className="workflow-list-header">
          <SectionHeading title={t("admin.workflows_list_title")} />
          <Link className="button button--primary" href="/admin/constructor/new">
            {t("admin.workflows_create")}
          </Link>
        </div>
        {hasLoadError ? (
          <div className="card card--outline workflow-empty">
            <div className="h3">{t("admin.workflows_load_error_title")}</div>
            <div className="text-muted">{t("admin.workflows_load_error_desc")}</div>
            <div className="workflow-actions">
              <Link className="button button--primary button--small" href="/admin/constructor/new">
                {t("admin.workflows_create")}
              </Link>
            </div>
          </div>
        ) : null}
        {!hasLoadError && workflows.length === 0 ? (
          <div className="card card--outline workflow-empty">
            <div className="h3">{t("admin.workflows_empty_title")}</div>
            <div className="text-muted">{t("admin.workflows_empty_desc")}</div>
            <div className="workflow-actions">
              <Link className="button button--primary button--small" href="/admin/constructor/new">
                {t("admin.workflows_create")}
              </Link>
            </div>
          </div>
        ) : null}
        <div className="workflow-list">
          {workflows.map((item) => (
            <ScenarioListItem
              key={item.serviceId}
              serviceId={item.serviceId}
              title={getWorkflowTitle(item.serviceId)}
              statusLabel={formatWorkflowStatus(item.status)}
              latestVersion={item.latestVersion}
              updatedLabel={formatDate(item.updatedAt)}
            />
          ))}
        </div>
      </div>
    </RailLayout>
  );
}
