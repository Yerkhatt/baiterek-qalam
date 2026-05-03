import { t } from "@/lib/i18n";

type StagePanelProps = {
  title: string;
  desc: string;
  status: string;
  statusTone?: "draft" | "review" | "success" | "wait";
};

const toneClass: Record<NonNullable<StagePanelProps["statusTone"]>, string> = {
  draft: "status-chip status-chip--draft",
  review: "status-chip status-chip--review",
  success: "status-chip status-chip--success",
  wait: "status-chip status-chip--wait"
};

export default function StagePanel({ title, desc, status, statusTone = "review" }: StagePanelProps) {
  return (
    <div className="card card--outline">
      <div className="stack">
        <span className={toneClass[statusTone]}>{status}</span>
        <div className="h3">{title}</div>
        <div className="text-muted">{desc}</div>
        <button className="button button--outline button--small" type="button">
          {t("common.open")}
        </button>
      </div>
    </div>
  );
}
