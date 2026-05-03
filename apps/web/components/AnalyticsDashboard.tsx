"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchEventStats } from "@/lib/runtimeApi";
import { t } from "@/lib/i18n";

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<{ total: number; counts: Record<string, number> }>({
    total: 0,
    counts: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await fetchEventStats();
        if (active) {
          setStats(result);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => stats.counts ?? {}, [stats.counts]);

  return (
    <div className="grid grid-2">
      <div className="card card--outline">
        <div className="h3">{t("analytics.events_total")}</div>
        <div className="h2">{loading ? "…" : stats.total}</div>
        <div className="text-muted">{t("analytics.events_desc")}</div>
      </div>
      <div className="card card--soft">
        <div className="h3">{t("analytics.stage1_approved")}</div>
        <div className="h2">{counts["application.stage1.approved"] ?? 0}</div>
        <div className="text-muted">{t("analytics.stage1_desc")}</div>
      </div>
      <div className="card card--outline">
        <div className="h3">{t("analytics.stage2_approved")}</div>
        <div className="h2">{counts["application.stage2.approved"] ?? 0}</div>
        <div className="text-muted">{t("analytics.stage2_desc")}</div>
      </div>
      <div className="card card--soft">
        <div className="h3">{t("analytics.stage1_submitted")}</div>
        <div className="h2">{counts["application.stage1.submitted"] ?? 0}</div>
        <div className="text-muted">{t("analytics.stage1_submitted_desc")}</div>
      </div>
    </div>
  );
}
