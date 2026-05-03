"use client";

import { useState } from "react";
import Link from "next/link";
import type { FormSchema } from "@qalam/form-engine";
import ServiceFormRunner from "@/components/ServiceFormRunner";
import { t } from "@/lib/i18n";

type Props = {
  serviceId: string;
  schema: FormSchema;
  briefing: string;
};

/**
 * Briefing-first UX: visitor reads `briefing`, then continues to the form.
 * State is in-memory only so each navigation to the service shows the briefing again.
 */
export default function ServiceBriefingGate({ serviceId, schema, briefing }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const serviceHeading = (schema.metadata?.title ?? "").trim() || serviceId;

  const onContinue = () => {
    setUnlocked(true);
  };

  if (!unlocked) {
    return (
      <div className="stack" style={{ gap: "1.25rem" }}>
        <h1 className="h2" style={{ margin: 0 }}>
          {serviceHeading}
        </h1>
        <div className="card card--outline">
          <div className="text-muted service-briefing-body">{briefing.trim() ? briefing : t("forms.visitor_briefing_empty")}</div>
        </div>
        <div className="form-actions" style={{ flexWrap: "wrap", gap: 12 }}>
          <button type="button" className="button button--primary" onClick={onContinue}>
            {t("forms.visitor_briefing_continue")}
          </button>
          <Link className="button button--ghost" href="/services">
            {t("forms.visitor_briefing_back_catalog")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <ServiceFormRunner serviceId={serviceId} schema={schema} />
    </div>
  );
}
