import RailLayout from "@/components/RailLayout";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";
import { getAdminNav } from "@/app/admin/nav";

export default function AdminSettingsPage() {
  return (
    <RailLayout nav={getAdminNav()}>
      <div className="stack">
        <SectionHeading title={t("admin.sections.settings.title")} />
        <div className="grid grid-2">
          <div className="card card--outline">
            <div className="h3">Интеграции</div>
            <div className="text-muted">EISH, eGov IDP, EDS, CRM.</div>
          </div>
          <div className="card card--soft">
            <div className="h3">Безопасность</div>
            <div className="text-muted">Роли, ключи и аудит действий.</div>
          </div>
        </div>
      </div>
    </RailLayout>
  );
}
