"use client";

import RailLayout from "@/components/RailLayout";
import SectionHeading from "@/components/SectionHeading";
import CabinetApplicationsList from "@/components/CabinetApplicationsList";
import { t } from "@/lib/i18n";

export default function ApplicationsShell() {
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
          eyebrow={t("cabinet.nav_applications")}
          title={t("cabinet.nav_applications")}
          subtitle={t("cabinet.sections.applications.desc")}
        />
        <CabinetApplicationsList />
      </div>
    </RailLayout>
  );
}
