import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SectionHeading from "@/components/SectionHeading";
import ServiceCard from "@/components/ServiceCard";
import StatsBand from "@/components/StatsBand";
import ContentTeaserCard from "@/components/ContentTeaserCard";
import { fetchPublishedCatalog } from "@/lib/schemaApi";
import type { ServiceCardView } from "@/lib/serviceCatalog";
import { getPublishedSchemas, mapSummaryToCard } from "@/lib/serviceCatalog";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let featuredServices: ServiceCardView[] = [];
  let catalogFetchFailed = false;
  try {
    const summaries = await fetchPublishedCatalog();
    featuredServices = getPublishedSchemas(summaries).slice(0, 3).map(mapSummaryToCard);
  } catch (err) {
    catalogFetchFailed = true;
    console.error("[HomePage] fetchPublishedCatalog failed:", err);
    featuredServices = [];
  }

  return (
    <>
      <PublicHeader />
      <main>
        <section className="section section--compact">
          <div className="container">
            <div className="hero hero--compact">
              <div className="stack">
                <div className="eyebrow">{t("brand.portalName")}</div>
                <h1 className="h1">{t("home.hero_title")}</h1>
                <p className="text-muted">{t("home.hero_subtitle")}</p>
              </div>
              <div className="hero-search">
                <input
                  aria-label={t("common.search")}
                  placeholder={t("common.search_placeholder")}
                  type="search"
                />
                <div className="text-muted">{t("common.search_hint")}</div>
                <div className="cta-row">
                  <Link className="button button--primary" href="/search">
                    {t("home.hero_cta_primary")}
                  </Link>
                  <Link className="button button--ghost" href="/cabinet">
                    {t("home.hero_cta_secondary")}
                  </Link>
                </div>
                <div className="badge badge--muted">{t("home.hero_note")}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section section--compact section--band">
          <div className="container stack">
            <SectionHeading
              eyebrow={t("nav.services")}
              title={t("home.directions_title")}
              subtitle={t("home.directions_subtitle")}
            />
            <div className="direction-strip">
              <div className="direction-tile reveal">
                <div className="direction-tile__meta">{t("home.direction_financing_meta")}</div>
                <div className="h3">{t("home.direction_financing_title")}</div>
                <div className="text-muted">{t("home.direction_financing_desc")}</div>
              </div>
              <div className="direction-tile reveal">
                <div className="direction-tile__meta">{t("home.direction_export_meta")}</div>
                <div className="h3">{t("home.direction_export_title")}</div>
                <div className="text-muted">{t("home.direction_export_desc")}</div>
              </div>
              <div className="direction-tile reveal">
                <div className="direction-tile__meta">{t("home.direction_guarantee_meta")}</div>
                <div className="h3">{t("home.direction_guarantee_title")}</div>
                <div className="text-muted">{t("home.direction_guarantee_desc")}</div>
              </div>
              <div className="direction-tile reveal">
                <div className="direction-tile__meta">{t("home.direction_innovation_meta")}</div>
                <div className="h3">{t("home.direction_innovation_title")}</div>
                <div className="text-muted">{t("home.direction_innovation_desc")}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section section--compact">
          <div className="container stack">
            <div className="stack section-heading">
              <div className="eyebrow">{t("services.catalog_title")}</div>
            </div>
            <div className="grid grid-3">
              {featuredServices.length === 0 ? (
                <div className="card card--outline">
                  <div className="stack">
                    <div className="h3">
                      {catalogFetchFailed ? t("home.featured_error_title") : t("home.featured_empty_title")}
                    </div>
                    <div className="text-muted">
                      {catalogFetchFailed ? t("home.featured_error_desc") : t("home.featured_empty_desc")}
                    </div>
                  </div>
                </div>
              ) : null}
              {featuredServices.map((service) => (
                <ServiceCard
                  key={service.serviceId}
                  href={service.href}
                  title={service.title}
                  summary={service.summary || undefined}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="section section--compact section--band">
          <div className="container grid grid-2">
            <div className="card card--outline">
              <SectionHeading
                eyebrow={t("home.how_title")}
                title={t("home.how_title")}
                subtitle={t("home.hero_note")}
              />
              <div className="surface-list">
                <div>
                  <div className="h3">{t("home.how_step_1_title")}</div>
                  <div className="text-muted">{t("home.how_step_1_desc")}</div>
                </div>
                <div>
                  <div className="h3">{t("home.how_step_2_title")}</div>
                  <div className="text-muted">{t("home.how_step_2_desc")}</div>
                </div>
                <div>
                  <div className="h3">{t("home.how_step_3_title")}</div>
                  <div className="text-muted">{t("home.how_step_3_desc")}</div>
                </div>
              </div>
            </div>
            <div className="card card--soft">
              <SectionHeading
                eyebrow={t("home.stats_title")}
                title={t("home.stats_title")}
                subtitle={t("brand.tagline")}
              />
              <StatsBand
                stats={[
                  { value: t("home.stats_services_value"), label: t("home.stats_services_label") },
                  { value: t("home.stats_time_value"), label: t("home.stats_time_label") },
                  { value: t("home.stats_window_value"), label: t("home.stats_window_label") }
                ]}
              />
            </div>
          </div>
        </section>

        <section className="section section--compact">
          <div className="container stack">
            <SectionHeading
              eyebrow={t("nav.news")}
              title={t("home.news_title")}
              subtitle={t("home.news_subtitle")}
            />
            <div className="grid grid-3">
              <ContentTeaserCard
                href="/news/1"
                title={t("news.item_1_title")}
                summary={t("news.item_1_summary")}
                meta={t("news.item_1_meta")}
                readMoreLabel={t("common.read_more")}
                showThumb
              />
              <ContentTeaserCard
                href="/news/2"
                title={t("news.item_2_title")}
                summary={t("news.item_2_summary")}
                meta={t("news.item_2_meta")}
                readMoreLabel={t("common.read_more")}
                showThumb
              />
              <ContentTeaserCard
                href="/news/3"
                title={t("news.item_3_title")}
                summary={t("news.item_3_summary")}
                meta={t("news.item_3_meta")}
                readMoreLabel={t("common.read_more")}
                showThumb
              />
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
