import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  return (
    <>
      <PublicHeader />
      <main className="section section--compact">
        <div className="container login-layout">
          <div className="card card--soft stack">
            <SectionHeading
              eyebrow={t("auth.egov_eyebrow")}
              title={t("auth.title")}
              subtitle={t("auth.subtitle")}
            />
            <p className="text-muted">{t("auth.helper")}</p>
            <div className="cta-row">
              <Link className="button button--primary" href="/cabinet">
                {t("auth.cta")}
              </Link>
            </div>
            <div className="login-trust">
              <div className="eyebrow">{t("auth.trust_title")}</div>
              <p>{t("auth.trust_body")}</p>
              <div className="badge badge--muted">{t("auth.egov_note")}</div>
            </div>
            <div className="text-muted">
              {t("auth.support")}{" "}
              <Link className="button button--ghost button--small" href={t("auth.faq_href")}>
                {t("auth.faq_link")}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
