import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SectionHeading from "@/components/SectionHeading";
import ContactsDepartmentTabs from "@/components/ContactsDepartmentTabs";
import { t } from "@/lib/i18n";

export default function ContactsPage() {
  return (
    <>
      <PublicHeader />
      <main className="section section--compact">
        <div className="container contacts-layout">
          <div className="card card--outline stack">
            <SectionHeading
              eyebrow={t("nav.contacts")}
              title={t("contacts.title")}
              subtitle={t("contacts.subtitle")}
            />
            <ContactsDepartmentTabs />
          </div>
          <div className="card card--soft stack">
            <div className="h3">{t("contacts.office_title")}</div>
            <div className="text-muted">{t("contacts.office_address")}</div>
            <div className="text-muted">{t("contacts.office_note")}</div>
            <div className="badge">{t("contacts.feedback_title")}</div>
            <div className="text-muted">{t("contacts.feedback_desc")}</div>
            <button className="button button--outline button--small" type="button">
              {t("contacts.feedback_cta")}
            </button>
          </div>
          <div className="contacts-map">{t("contacts.map_placeholder")}</div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
