import Link from "next/link";
import { t } from "@/lib/i18n";

type AdminSectionCardProps = {
  title: string;
  desc?: string;
  href: string;
};

export default function AdminSectionCard({ title, desc, href }: AdminSectionCardProps) {
  return (
    <div className="card card--outline reveal">
      <div className="stack">
        <div className="h3">{title}</div>
        {desc ? <div className="text-muted">{desc}</div> : null}
        <Link className="button button--outline button--small" href={href}>
          {t("common.open")}
        </Link>
      </div>
    </div>
  );
}
