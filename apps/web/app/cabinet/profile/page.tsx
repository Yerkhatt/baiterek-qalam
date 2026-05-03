import RailLayout from "@/components/RailLayout";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";

export default function ProfilePage() {
  return (
    <RailLayout
      title={t("cabinet.title")}
      subtitle={t("cabinet.subtitle")}
      nav={[
        { href: "/cabinet", label: t("cabinet.nav_overview") },
        { href: "/cabinet/applications", label: t("cabinet.nav_applications") },
        { href: "/cabinet/documents", label: t("cabinet.nav_documents") },
        { href: "/cabinet/notifications", label: t("cabinet.nav_notifications") },
        { href: "/cabinet/profile", label: t("cabinet.nav_profile") },
        { href: "/cabinet/bookings", label: t("cabinet.nav_bookings"), badge: t("common.in_progress") }
      ]}
    >
      <div className="stack">
        <SectionHeading
          eyebrow={t("cabinet.nav_profile")}
          title={t("cabinet.nav_profile")}
          subtitle={t("cabinet.sections.profile.desc")}
        />
        <div className="grid grid-2">
          <div className="card card--outline">
            <div className="h3">ТОО "Qalam Demo"</div>
            <div className="list">
              <span>БИН: 220340009988</span>
              <span>Контакт: Айгуль Ермекова</span>
              <span>Email: office@qalam.kz</span>
            </div>
          </div>
          <div className="card card--soft">
            <div className="h3">ЭЦП</div>
            <div className="text-muted">Активна до 12.02.2027</div>
            <button className="button button--outline button--small" type="button">
              Обновить ключ
            </button>
          </div>
        </div>
      </div>
    </RailLayout>
  );
}
