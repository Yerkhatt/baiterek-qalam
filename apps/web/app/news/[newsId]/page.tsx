import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";

const ITEMS = ["1", "2", "3"] as const;

function newsKeys(id: string) {
  if (!ITEMS.includes(id as (typeof ITEMS)[number])) {
    return null;
  }
  return {
    title: `news.item_${id}_title` as const,
    summary: `news.item_${id}_summary` as const,
    body: `news.item_${id}_body` as const,
    org: `news.item_${id}_org` as const,
    date: `news.item_${id}_date` as const
  };
}

export default function NewsDetailPage({ params }: { params: { newsId: string } }) {
  const keys = newsKeys(params.newsId);
  if (!keys) {
    notFound();
  }

  return (
    <>
      <PublicHeader />
      <main className="section section--compact">
        <div className="container">
          <nav className="breadcrumb-trail" aria-label={t("nav.breadcrumb_aria")}>
            <Link href="/">{t("nav.home")}</Link>
            {" / "}
            <Link href="/news">{t("nav.news")}</Link>
            {" / "}
            <span className="text-muted">{t(keys.title)}</span>
          </nav>
          <div className="stack mt-3">
            <SectionHeading eyebrow={t("nav.news")} title={t(keys.title)} subtitle={t(keys.summary)} />
            <div className="chip-link-grid">
              <span className="badge badge--muted">
                {t("news.detail_source_label")}: {t(keys.org)}
              </span>
              <span className="badge badge--muted">
                {t("news.detail_date_label")}: {t(keys.date)}
              </span>
            </div>
          </div>
          <div className="article-2col mt-4">
            <article id="news-top" className="card card--outline stack">
              <div className="article-body text-muted">{t(keys.body)}</div>
              <Link className="button button--ghost button--small" href="/news">
                {t("common.back")}
              </Link>
            </article>
            <aside className="article-aside">
              <div className="article-aside-title">{t("news.related_title")}</div>
              <div className="stack">
                <Link className="button button--outline button--small" href="/services">
                  {t("services.catalog_title")}
                </Link>
                <Link className="button button--outline button--small" href="/services/export">
                  {t("services.export.title")}
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
