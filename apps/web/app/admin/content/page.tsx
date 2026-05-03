import Link from "next/link";
import RailLayout from "@/components/RailLayout";
import SectionHeading from "@/components/SectionHeading";
import { t } from "@/lib/i18n";
import { getAdminNav } from "@/app/admin/nav";

export default function AdminContentPage() {
  return (
    <RailLayout nav={getAdminNav()}>
      <div className="stack">
        <SectionHeading title={t("admin.sections.content.title")} />
        <div className="grid grid-2">
          <div className="card card--outline stack">
            <div className="h3">{t("admin.content_pages_title")}</div>
            <p className="text-muted">{t("admin.content_pages_desc")}</p>
            <span className="status-chip status-chip--success">{t("admin.content_pages_status")}</span>
            <p className="text-muted">{t("admin.content_updated", { value: "30.04.2026" })}</p>
            <Link className="button button--primary button--small" href="/news">
              {t("admin.content_action_edit")}
            </Link>
          </div>
          <div className="card card--soft stack">
            <div className="h3">{t("admin.content_kb_title")}</div>
            <p className="text-muted">{t("admin.content_kb_desc")}</p>
            <span className="status-chip status-chip--draft">{t("admin.content_kb_status")}</span>
            <p className="text-muted">{t("admin.content_updated", { value: "28.04.2026" })}</p>
            <Link className="button button--outline button--small" href="/knowledge">
              {t("admin.content_action_edit")}
            </Link>
          </div>
        </div>
      </div>
    </RailLayout>
  );
}
