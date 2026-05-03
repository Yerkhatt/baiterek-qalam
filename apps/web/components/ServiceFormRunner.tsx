"use client";

import { useEffect, useState } from "react";
import type { FormSchema } from "@qalam/form-engine";
import FormRuntime from "@/components/FormRuntime";
import { upsertApplication } from "@/lib/runtimeApi";
import { t } from "@/lib/i18n";

type Props = {
  serviceId: string;
  schema: FormSchema;
};

function createPublicAppId(serviceId: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `pub-${serviceId}-${crypto.randomUUID()}`
    : `pub-${serviceId}-${Date.now()}`;
}

/**
 * Public service: новая анонимная заявка при каждом входе на форму (после брифинга),
 * без продолжения черновика прошлого визита.
 */
export default function ServiceFormRunner({ serviceId, schema }: Props) {
  const [appId, setAppId] = useState<string | null>(null);

  useEffect(() => {
    setAppId(createPublicAppId(serviceId));
  }, [serviceId]);

  useEffect(() => {
    if (!appId) {
      return;
    }
    void upsertApplication(appId, serviceId).catch(() => null);
  }, [appId, serviceId]);

  if (!appId) {
    return (
      <section className="card card--outline stack" aria-label="Форма заявки">
        <div className="text-muted" style={{ padding: "1rem" }}>
          {t("forms.session_init")}
        </div>
      </section>
    );
  }

  return (
    <section className="card card--outline stack" aria-label="Форма заявки">
      <FormRuntime appId={appId} schema={schema} serviceId={serviceId} />
    </section>
  );
}
