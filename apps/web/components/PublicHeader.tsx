import Link from "next/link";
import { t } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import PublicNavLinks from "@/components/PublicNavLinks";

export default function PublicHeader() {
  return (
    <header className="public-header">
      <div className="navbar">
        <div className="container navbar-inner">
          <Link className="brand" href="/">
            {t("brand.name")}
            <span>{t("brand.portalName")}</span>
          </Link>
          <div className="navbar-center">
            <PublicNavLinks />
          </div>
          <div className="navbar-end">
            <div className="header-contact">
              <span className="text-muted">{t("common.call_center")}:</span>
              <span>{t("common.call_center_phone")}</span>
            </div>
            <div className="nav-actions">
              <LanguageSelector />
              <Link className="button button--ghost" href="/auth/login">
                {t("nav.login")}
              </Link>
              <Link className="button button--primary" href="/cabinet">
                {t("nav.cabinet")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
