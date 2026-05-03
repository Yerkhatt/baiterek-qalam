import RailLayout from "@/components/RailLayout";
import FormRuntimeLoader from "@/components/FormRuntimeLoader";
import { t } from "@/lib/i18n";

export default function ApplicationFormPage({
  params,
  searchParams
}: {
  params: { appId: string };
  searchParams?: { serviceId?: string };
}) {
  const serviceId = searchParams?.serviceId;
  const titleKey = serviceId ? `services.${serviceId}.title` : "forms.application_title";
  const subtitleKey = serviceId ? `services.${serviceId}.summary` : "forms.application_subtitle";

  return (
    <RailLayout
      title={t(titleKey)}
      subtitle={t(subtitleKey)}
      nav={[
        { href: "/cabinet", label: t("cabinet.nav_overview") },
        { href: "/cabinet/applications", label: t("cabinet.nav_applications") },
        { href: "/cabinet/documents", label: t("cabinet.nav_documents") },
        { href: "/cabinet/notifications", label: t("cabinet.nav_notifications") },
        { href: "/cabinet/profile", label: t("cabinet.nav_profile") },
        { href: "/cabinet/bookings", label: t("cabinet.nav_bookings"), badge: t("common.in_progress") }
      ]}
    >
      <FormRuntimeLoader appId={params.appId} serviceId={searchParams?.serviceId} />
    </RailLayout>
  );
}
