"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import SectionHeading from "@/components/SectionHeading";
import {
  appendCabinetApplication,
  PENDING_EGOV_SIGN_KEY,
  type PendingEgovSignPayload
} from "@/lib/cabinetSession";
import { resolveStaleDemoTitle } from "@/lib/serviceCatalog";
import { t } from "@/lib/i18n";
import { migrateSchema } from "@qalam/form-engine";
import { fetchSchema } from "@/lib/schemaApi";
import { finalizeRuntimeAfterEgovMock } from "@/lib/runtime/resumeAfterEgovSign";
import { fetchRuntime, saveRuntime, submitApplication } from "@/lib/runtimeApi";

export default function EgovSignMockPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const readPending = useCallback((): PendingEgovSignPayload | null => {
    try {
      const raw = sessionStorage.getItem(PENDING_EGOV_SIGN_KEY);
      if (!raw) {
        return null;
      }
      const data = JSON.parse(raw) as PendingEgovSignPayload;
      if (!data?.appId) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const onCancel = useCallback(() => {
    try {
      sessionStorage.removeItem(PENDING_EGOV_SIGN_KEY);
    } catch {
      /* ignore */
    }
    router.push("/services");
  }, [router]);

  const onConfirm = useCallback(async () => {
    const pending = readPending();
    if (!pending) {
      setError(t("auth.egov_sign_error_missing"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const snapshot = await fetchRuntime(pending.appId);
      let payload = snapshot;

      const serviceKey = pending.serviceId?.trim();
      if (snapshot && serviceKey) {
        const rawSchema = await fetchSchema(serviceKey);
        if (rawSchema) {
          const migrated = migrateSchema(rawSchema);
          const finalized = await finalizeRuntimeAfterEgovMock(migrated, snapshot);
          payload = {
            appId: pending.appId,
            nodeId: finalized.nodeId,
            history: finalized.history,
            state: finalized.state,
            events: finalized.events
          };
          try {
            await saveRuntime(pending.appId, payload);
          } catch {
            /* submit still attempted */
          }
        }
      }

      await submitApplication(pending.appId, payload ?? undefined);
      appendCabinetApplication({
        appId: pending.appId,
        serviceId: pending.serviceId,
        serviceTitle: resolveStaleDemoTitle(pending.serviceTitle, pending.serviceId),
        submittedAt: new Date().toISOString()
      });
      try {
        sessionStorage.removeItem(PENDING_EGOV_SIGN_KEY);
      } catch {
        /* ignore */
      }
      router.push(pending.returnTo || "/cabinet/applications");
    } catch {
      setError(t("auth.egov_sign_error_submit"));
      setBusy(false);
    }
  }, [readPending, router]);

  return (
    <>
      <PublicHeader />
      <main className="section section--compact">
        <div className="container login-layout">
          <div className="card card--soft stack">
            <SectionHeading
              eyebrow={t("auth.egov_eyebrow")}
              title={t("auth.egov_sign_title")}
              subtitle={t("auth.egov_sign_subtitle")}
            />
            <p className="text-muted">{t("auth.egov_sign_helper")}</p>
            {error ? <div className="form-error">{error}</div> : null}
            <div className="cta-row">
              <button type="button" className="button button--primary" disabled={busy} onClick={() => void onConfirm()}>
                {busy ? t("auth.egov_sign_busy") : t("auth.egov_sign_confirm")}
              </button>
              <button type="button" className="button button--ghost" disabled={busy} onClick={onCancel}>
                {t("auth.egov_sign_cancel")}
              </button>
            </div>
            <div className="login-trust">
              <div className="eyebrow">{t("auth.trust_title")}</div>
              <p>{t("auth.trust_body")}</p>
              <div className="badge badge--muted">{t("auth.egov_note")}</div>
            </div>
            <div className="text-muted">
              <Link className="button button--ghost button--small" href="/services">
                {t("auth.egov_sign_back_catalog")}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
