"use client";

import { useEffect } from "react";
import type { FormSchema, ServiceMetadata } from "@qalam/form-engine";
import { t } from "@/lib/i18n";

type Props = {
  schema: FormSchema;
  onChange: (patch: Partial<ServiceMetadata>) => void;
  onClose: () => void;
};

export function ConstructorMetadataScreen({ schema, onChange, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="cmeta-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cmeta-screen-title"
    >
      <div className="cmeta-screen-bar">
        <h2 className="cmeta-screen-title" id="cmeta-screen-title">
          {t("forms.constructor.visitor_screen_title")}
        </h2>
        <p className="cmeta-screen-hint">{t("forms.constructor.visitor_screen_hint")}</p>
        <button type="button" className="ctb-btn ctb-btn--save" onClick={onClose}>
          Вернуться к холсту
        </button>
      </div>

      <div className="card card--outline cmeta-screen-card">
        <label className="form-field">
          <span className="form-label">{t("forms.constructor.portal_title_label")}</span>
          <span className="form-hint text-muted">{t("forms.constructor.portal_title_hint")}</span>
          <input
            type="text"
            className="form-input"
            value={schema.metadata?.title ?? ""}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={t("forms.constructor.portal_title_placeholder")}
            spellCheck
            autoComplete="off"
          />
        </label>
        <label className="form-field">
          <span className="form-label">{t("forms.constructor.visitor_textarea_label")}</span>
          <textarea
            className="form-textarea cmeta-visitor-briefing"
            rows={18}
            value={schema.metadata?.visitorBriefing ?? ""}
            onChange={(event) => onChange({ visitorBriefing: event.target.value })}
            spellCheck
          />
        </label>
      </div>
    </div>
  );
}
