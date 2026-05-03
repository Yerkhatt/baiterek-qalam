import Link from "next/link";
import { t } from "@/lib/i18n";

type ServiceCardProps = {
  href: string;
  title: string;
  summary?: string;
};

export default function ServiceCard({ href, title, summary }: ServiceCardProps) {
  return (
    <div className="card reveal">
      <div className="stack">
        <div className="h3">{title}</div>
        {summary ? <div className="text-muted">{summary}</div> : null}
        <Link className="button button--primary button--small" href={href}>
          {t("services.card_cta")}
        </Link>
      </div>
    </div>
  );
}
