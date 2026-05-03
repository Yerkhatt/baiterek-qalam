"use client";

import Link from "next/link";
import { useState } from "react";
import { t } from "@/lib/i18n";

type Tab = "services" | "knowledge" | "news";

export default function SearchExperience() {
  const [tab, setTab] = useState<Tab>("services");

  return (
    <div className="search-shell">
      <div className="search-tabs" role="tablist" aria-label={t("search.tabs_aria")}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "services"}
          className={`search-tab${tab === "services" ? " is-active" : ""}`}
          onClick={() => setTab("services")}
        >
          {t("search.tab_services")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "knowledge"}
          className={`search-tab${tab === "knowledge" ? " is-active" : ""}`}
          onClick={() => setTab("knowledge")}
        >
          {t("search.tab_knowledge")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "news"}
          className={`search-tab${tab === "news" ? " is-active" : ""}`}
          onClick={() => setTab("news")}
        >
          {t("search.tab_news")}
        </button>
      </div>
      <div className="search-panel" role="tabpanel">
        <p className="text-muted">{t(`search.tab_hint_${tab}`)}</p>
        <div className="empty-block stack mt-3">
          <div className="empty-block__title">{t("search.empty_query_title")}</div>
          <div>{t("search.empty_query_desc")}</div>
          <div className="chip-link-grid chip-link-grid--center">
            <Link className="chip-link" href="/services">
              {t("search.quick_services")}
            </Link>
            <Link className="chip-link" href="/knowledge">
              {t("search.quick_knowledge")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
