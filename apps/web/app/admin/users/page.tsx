import RailLayout from "@/components/RailLayout";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";
import { getAdminNav } from "@/app/admin/nav";

export default function AdminUsersPage() {
  return (
    <RailLayout nav={getAdminNav()}>
      <div className="stack">
        <SectionHeading title={t("admin.sections.users.title")} />
        <div className="grid grid-2">
          <div className="card card--outline">
            <div className="h3">Администраторы</div>
            <div className="text-muted">Полный доступ, аудит и настройки.</div>
          </div>
          <div className="card card--soft">
            <div className="h3">Авторы услуг</div>
            <div className="text-muted">Редактирование карточек и форм.</div>
          </div>
        </div>
      </div>
    </RailLayout>
  );
}
