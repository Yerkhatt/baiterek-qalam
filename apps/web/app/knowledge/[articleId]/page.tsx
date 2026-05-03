import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";

const ARTICLES = ["1", "2", "3"] as const;

function articleKeys(id: string) {
  if (!ARTICLES.includes(id as (typeof ARTICLES)[number])) {
    return null;
  }
  return {
    title: `knowledge.article_${id}_title` as const,
    summary: `knowledge.article_${id}_summary` as const,
    body: `knowledge.article_${id}_body` as const
  };
}

export default function KnowledgeArticlePage({ params }: { params: { articleId: string } }) {
  const keys = articleKeys(params.articleId);
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
            <Link href="/knowledge">{t("nav.knowledge")}</Link>
            {" / "}
            <span className="text-muted">{t(keys.title)}</span>
          </nav>
          <div className="stack mt-3">
            <SectionHeading eyebrow={t("nav.knowledge")} title={t(keys.title)} subtitle={t(keys.summary)} />
          </div>
          <div className="article-2col mt-4">
            <article id="article-top" className="card card--outline stack">
              <div className="article-body text-muted">{t(keys.body)}</div>
              <Link className="button button--ghost button--small" href="/knowledge">
                {t("common.back")}
              </Link>
            </article>
            <aside className="article-aside" aria-label={t("knowledge.aside_toc")}>
              <div className="article-aside-title">{t("knowledge.aside_toc")}</div>
              <ul className="list">
                <li>
                  <Link href="#article-top">{t(keys.title)}</Link>
                </li>
                <li className="text-muted">{t("knowledge.article_2_title")}</li>
                <li className="text-muted">{t("knowledge.article_3_title")}</li>
              </ul>
              <div className="article-aside-title">{t("knowledge.aside_related")}</div>
              <Link className="button button--outline button--small" href="/services">
                {t("services.catalog_title")}
              </Link>
            </aside>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
