"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readCabinetApplications, type CabinetApplicationEntry } from "@/lib/cabinetSession";
import { resolveStaleDemoTitle } from "@/lib/serviceCatalog";
import { t } from "@/lib/i18n";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function CabinetApplicationsList() {
  const [items, setItems] = useState<CabinetApplicationEntry[]>([]);

  useEffect(() => {
    setItems(readCabinetApplications());
  }, []);

  if (items.length === 0) {
    return (
      <div className="card card--outline">
        <div className="stack">
          <div className="h3">{t("cabinet.applications_empty_title")}</div>
          <p className="text-muted">{t("cabinet.applications_empty_desc")}</p>
          <Link className="button button--primary" href="/services">
            {t("nav.services")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      {items.map((application) => {
        const displayTitle = resolveStaleDemoTitle(application.serviceTitle, application.serviceId);
        const displayServiceId = resolveStaleDemoTitle(application.serviceId, application.serviceTitle);
        return (
          <div key={application.appId} className="card card--outline">
            <div className="stack">
              <div className="h3">{displayTitle}</div>
              <div className="list">
                <span>
                  {t("common.status")}: {t("common.status_submitted")}
                </span>
                <span>
                  {t("cabinet.applications_service_id")}: {displayServiceId || "—"}
                </span>
                <span>
                  {t("common.last_update")}: {formatDate(application.submittedAt)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
