import Link from "next/link";

type ContentTeaserCardProps = {
  href: string;
  title: string;
  summary: string;
  meta?: string;
  readMoreLabel: string;
  showThumb?: boolean;
};

export default function ContentTeaserCard({
  href,
  title,
  summary,
  meta,
  readMoreLabel,
  showThumb = false
}: ContentTeaserCardProps) {
  return (
    <article className="teaser-card reveal">
      {showThumb ? <div className="teaser-card__thumb" aria-hidden /> : null}
      {meta ? <div className="teaser-card__meta">{meta}</div> : null}
      <div className="h3">{title}</div>
      <p className="text-muted">{summary}</p>
      <Link className="button button--outline button--small" href={href}>
        {readMoreLabel}
      </Link>
    </article>
  );
}
