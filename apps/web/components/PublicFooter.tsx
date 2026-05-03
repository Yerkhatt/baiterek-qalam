import Link from "next/link";
import { t } from "@/lib/i18n";

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="container footer-grid">
        <div className="stack">
          <div className="h3">{t("brand.name")}</div>
          <p className="text-muted">{t("brand.tagline")}</p>
          <div className="badge">{t("common.currency_kzt")}</div>
        </div>
        <div className="stack">
          <div className="h3">{t("nav.services")}</div>
          <Link href="/services">{t("services.catalog_title")}</Link>
          <Link href="/knowledge">{t("nav.knowledge")}</Link>
        </div>
        <div className="stack">
          <div className="h3">{t("nav.contacts")}</div>
          <span>{t("contacts.hotline_phone")}</span>
          <span>{t("contacts.hotline_email")}</span>
          <span>{t("contacts.office_address")}</span>
        </div>
      </div>
    </footer>
  );
}
