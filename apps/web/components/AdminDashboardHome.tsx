import AdminSectionCard from "@/components/AdminSectionCard";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";

type AdminDashboardHomeProps = {
  /** Shown only on design-preview routes so you can tell variants apart in screenshots. */
  variantTag?: string;
};

export default function AdminDashboardHome({ variantTag }: AdminDashboardHomeProps) {
  return (
    <div className="stack">
      {variantTag ? (
        <div className="admin-design-preview-tag" aria-hidden>
          {variantTag}
        </div>
      ) : null}
      <SectionHeading title={t("admin.dashboard_quick_actions")} />
      <div className="kpi-grid">
        <div className="card card--outline">
          <div className="metric">
            <span className="text-muted">{t("admin.dashboard_kpi_services")}</span>
            <span className="metric-value">72</span>
          </div>
        </div>
        <div className="card card--outline">
          <div className="metric">
            <span className="text-muted">{t("admin.dashboard_kpi_active_apps")}</span>
            <span className="metric-value">118</span>
          </div>
        </div>
        <div className="card card--outline">
          <div className="metric">
            <span className="text-muted">{t("admin.dashboard_kpi_drafts")}</span>
            <span className="metric-value">46</span>
          </div>
        </div>
        <div className="card card--outline">
          <div className="metric">
            <span className="text-muted">{t("admin.dashboard_kpi_sla")}</span>
            <span className="metric-value">94%</span>
          </div>
        </div>
      </div>
      <div className="grid grid-3">
        <AdminSectionCard title={t("admin.sections.services.title")} href="/admin/services" />
        <AdminSectionCard title={t("admin.sections.forms.title")} href="/admin/constructor" />
        <AdminSectionCard title={t("admin.sections.content.title")} href="/admin/content" />
        <AdminSectionCard title={t("admin.sections.applications.title")} href="/admin/applications" />
        <AdminSectionCard title={t("admin.sections.users.title")} href="/admin/users" />
        <AdminSectionCard title={t("admin.sections.analytics.title")} href="/admin/analytics" />
      </div>
    </div>
  );
}
