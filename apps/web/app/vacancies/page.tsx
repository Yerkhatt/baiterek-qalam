import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";

export default function VacanciesPage() {
  return (
    <>
      <PublicHeader />
      <main className="section section--compact">
        <div className="container">
          <div className="card card--outline stack">
            <SectionHeading
              eyebrow={t("nav.vacancies")}
              title={t("vacancies.title")}
              subtitle={t("vacancies.subtitle")}
            />
            <div className="h3">{t("vacancies.locations_title")}</div>
            <ul className="checklist">
              <li>{t("vacancies.location_astana")}</li>
              <li>{t("vacancies.location_almaty")}</li>
              <li>{t("vacancies.location_remote")}</li>
            </ul>
            <p className="text-muted">{t("vacancies.disclaimer")}</p>
            <div className="cta-row">
              <Link className="button button--primary button--small" href="https://hh.kz" target="_blank" rel="noreferrer">
                {t("vacancies.cta")}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
