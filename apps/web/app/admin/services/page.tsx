import Link from "next/link";
import RailLayout from "@/components/RailLayout";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";
import { getAdminNav } from "@/app/admin/nav";
import { fetchSchemas, type SchemaSummary } from "@/lib/schemaApi";

function statusChip(statusKey: SchemaSummary["status"]) {
  if (statusKey === "published") {
    return (
      <span className="status-chip status-chip--success">{t("admin.workflow_status_published")}</span>
    );
  }
  if (statusKey === "archived") {
    return (
      <span className="status-chip status-chip--draft">{t("admin.workflow_status_archived")}</span>
    );
  }
  return <span className="status-chip status-chip--draft">{t("admin.workflow_status_draft")}</span>;
}

export default async function AdminServicesPage() {
  let services: SchemaSummary[] = [];
  try {
    services = await fetchSchemas();
  } catch {
    services = [];
  }

  return (
    <RailLayout nav={getAdminNav()}>
      <div className="stack">
        <SectionHeading title={t("admin.sections.services.title")} />
        <div className="card card--outline table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>{t("admin.services_table_service")}</th>
                <th>{t("admin.services_table_status")}</th>
                <th>{t("admin.services_table_briefing")}</th>
                <th>{t("admin.services_table_updated")}</th>
                <th>{t("admin.services_table_action")}</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.serviceId}>
                  <td>{service.serviceId}</td>
                  <td>{statusChip(service.status)}</td>
                  <td className="text-muted">
                    {(service.metadata?.visitorBriefing ?? "").trim().slice(0, 120)}
                    {(service.metadata?.visitorBriefing ?? "").trim().length > 120 ? "…" : ""}
                  </td>
                  <td>{new Date(service.updatedAt).toLocaleDateString("ru-RU")}</td>
                  <td>
                    <Link
                      className="button button--outline button--small"
                      href={`/services/${encodeURIComponent(service.serviceId)}`}
                    >
                      {t("admin.services_open")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RailLayout>
  );
}
