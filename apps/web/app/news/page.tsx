import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SectionHeading from "@/components/SectionHeading";
import ContentTeaserCard from "@/components/ContentTeaserCard";
import { t } from "@/lib/i18n";

const FILTERS = ["filter_all", "filter_holding", "filter_leasing", "filter_export"] as const;

export default function NewsPage() {
  return (
    <>
      <PublicHeader />
      <main className="section section--compact">
        <div className="container stack">
          <SectionHeading
            eyebrow={t("nav.news")}
            title={t("news.title")}
            subtitle={t("news.subtitle")}
          />
          <div className="chip-link-grid" aria-label={t("common.filters")}>
            {FILTERS.map((key, i) => (
              <span key={key} className={`chip-link${i === 0 ? " is-active" : ""}`}>
                {t(`news.${key}`)}
              </span>
            ))}
          </div>
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
      </main>
      <PublicFooter />
    </>
  );
}
