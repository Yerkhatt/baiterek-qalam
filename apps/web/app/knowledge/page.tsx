import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SectionHeading from "@/components/SectionHeading";
import ContentTeaserCard from "@/components/ContentTeaserCard";
import { t } from "@/lib/i18n";

const FILTERS = ["filter_all", "filter_finance", "filter_docs", "filter_eds"] as const;

export default function KnowledgePage() {
  return (
    <>
      <PublicHeader />
      <main className="section section--compact">
        <div className="container stack">
          <SectionHeading
            eyebrow={t("nav.knowledge")}
            title={t("knowledge.title")}
            subtitle={t("knowledge.subtitle")}
          />
          <div className="card card--outline stack">
            <input
              className="form-input"
              type="search"
              placeholder={t("knowledge.search_placeholder")}
              aria-label={t("knowledge.search_placeholder")}
            />
            <div className="chip-link-grid" aria-label={t("common.filters")}>
              {FILTERS.map((key, i) => (
                <span key={key} className={`chip-link${i === 0 ? " is-active" : ""}`}>
                  {t(`knowledge.${key}`)}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-3">
            <ContentTeaserCard
              href="/knowledge/1"
              title={t("knowledge.article_1_title")}
              summary={t("knowledge.article_1_summary")}
              meta={t("knowledge.article_1_meta")}
              readMoreLabel={t("common.read_more")}
            />
            <ContentTeaserCard
              href="/knowledge/2"
              title={t("knowledge.article_2_title")}
              summary={t("knowledge.article_2_summary")}
              meta={t("knowledge.article_2_meta")}
              readMoreLabel={t("common.read_more")}
            />
            <ContentTeaserCard
              href="/knowledge/3"
              title={t("knowledge.article_3_title")}
              summary={t("knowledge.article_3_summary")}
              meta={t("knowledge.article_3_meta")}
              readMoreLabel={t("common.read_more")}
            />
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
