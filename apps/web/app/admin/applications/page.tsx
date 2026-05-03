import RailLayout from "@/components/RailLayout";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";
import { getAdminNav } from "@/app/admin/nav";

const apps = [
  {
    id: "lease-001",
    title: "Заявка 001",
    status: t("common.status_in_review"),
    stage: "I",
    sla: "2 дня"
  },
  {
    id: "exp-018",
    title: "Заявка 018",
    status: t("common.status_info_requested"),
    stage: "I",
    sla: "5 дней"
  }
];

export default function AdminApplicationsPage() {
  return (
    <RailLayout nav={getAdminNav()}>
      <div className="stack">
        <SectionHeading title={t("admin.sections.applications.title")} />
        <div className="grid">
          {apps.map((app) => (
            <div className="card card--outline" key={app.id}>
              <div className="stack">
                <div className="h3">{app.title}</div>
                <div className="list">
                  <span>{t("common.status")}: {app.status}</span>
                  <span>{t("common.stage", { value: app.stage })}</span>
                  <span>SLA: {app.sla}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RailLayout>
  );
}
