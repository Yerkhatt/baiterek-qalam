"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";

const DEPTS = ["holding", "export"] as const;

export default function ContactsDepartmentTabs() {
  const [dept, setDept] = useState<(typeof DEPTS)[number]>("holding");

  return (
    <div>
      <div className="dept-tabs" role="tablist" aria-label={t("contacts.dept_tabs_aria")}>
        {DEPTS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={dept === id}
            className={`dept-tab${dept === id ? " is-active" : ""}`}
            onClick={() => setDept(id)}
          >
            {t(`contacts.dept_${id}`)}
          </button>
        ))}
      </div>
      <div className="surface-list" role="tabpanel">
        <div className="h3">{t(`contacts.dept_${dept}_title`)}</div>
        <div className="text-muted">{t(`contacts.dept_${dept}_desc`)}</div>
        <div>{t("contacts.hotline_phone")}</div>
        <div className="text-muted">{t("contacts.hotline_email")}</div>
      </div>
    </div>
  );
}
