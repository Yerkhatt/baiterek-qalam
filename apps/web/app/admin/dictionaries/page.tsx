import RailLayout from "@/components/RailLayout";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";
import { getAdminNav } from "@/app/admin/nav";

export default function AdminDictionariesPage() {
  return (
    <RailLayout nav={getAdminNav()}>
      <div className="stack">
        <SectionHeading title={t("admin.sections.dictionaries.title")} />
        <div className="grid grid-2">
          <div className="card card--outline">
            <div className="h3">КАТО и регионы</div>
            <div className="text-muted">Единые справочники территорий.</div>
          </div>
          <div className="card card--soft">
            <div className="h3">Отрасли и виды бизнеса</div>
            <div className="text-muted">Используются во всех сервисах.</div>
          </div>
        </div>
      </div>
    </RailLayout>
  );
}
