import RailLayout from "@/components/RailLayout";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";

export default function BookingsPage() {
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
          eyebrow={t("cabinet.nav_bookings")}
          title={t("cabinet.nav_bookings")}
          subtitle={t("cabinet.sections.bookings.desc")}
        />
        <div className="card card--outline">
          <div className="h3">Онлайн-запись подключается</div>
          <div className="text-muted">Данные Bitrix будут отображаться здесь.</div>
        </div>
      </div>
    </RailLayout>
  );
}
