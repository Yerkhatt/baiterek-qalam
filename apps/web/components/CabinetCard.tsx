import Link from "next/link";
import { t } from "@/lib/i18n";

type CabinetCardProps = {
  title: string;
  desc: string;
  href: string;
};

export default function CabinetCard({ title, desc, href }: CabinetCardProps) {
  return (
    <div className="card card--outline reveal">
      <div className="stack">
        <div className="h3">{title}</div>
        <div className="text-muted">{desc}</div>
        <Link className="button button--outline button--small" href={href}>
          {t("common.open")}
        </Link>
      </div>
    </div>
  );
}
