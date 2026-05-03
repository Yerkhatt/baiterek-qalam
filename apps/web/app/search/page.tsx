import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SectionHeading from "@/components/SectionHeading";
import SearchExperience from "@/components/SearchExperience";
import { t } from "@/lib/i18n";

export default function SearchPage() {
  return (
    <>
      <PublicHeader />
      <main className="section section--compact">
        <div className="container stack">
          <SectionHeading
            eyebrow={t("nav.search")}
            title={t("search.title")}
            subtitle={t("search.subtitle")}
          />
          <div className="hero-search">
            <input
              className="form-input"
              aria-label={t("common.search")}
              placeholder={t("common.search_placeholder")}
              type="search"
              name="q"
            />
            <p className="text-muted">{t("search.helper")}</p>
            <div className="chip-link-grid">
              <Link className="chip-link" href="/services">
                {t("search.quick_services")}
              </Link>
              <Link className="chip-link" href="/knowledge">
                {t("search.quick_knowledge")}
              </Link>
              <Link className="chip-link" href="/services">
                {t("search.quick_leasing")}
              </Link>
            </div>
          </div>
          <SearchExperience />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
