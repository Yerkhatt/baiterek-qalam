"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FormSchema } from "@qalam/form-engine";
import FormRuntime from "@/components/FormRuntime";
import { formatApiError } from "@/lib/errorMessage";
import { fetchSchema } from "@/lib/schemaApi";
import { upsertApplication } from "@/lib/runtimeApi";
import { t } from "@/lib/i18n";

const EMPTY_SCHEMA: FormSchema = {
  schemaVersion: 1,
  start: "start",
  nodes: []
};

type FormRuntimeLoaderProps = {
  appId: string;
  serviceId?: string;
};

export default function FormRuntimeLoader({ appId, serviceId }: FormRuntimeLoaderProps) {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!serviceId) {
        if (active) {
          setSchema(null);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const loaded = await fetchSchema(serviceId);
        if (!active) {
          return;
        }
        if (loaded) {
          try {
            await upsertApplication(appId, serviceId);
          } catch {
            /* offline / API down: still allow filling */
          }
        }
        setSchema(loaded);
        setError(null);
      } catch (error) {
        if (active) {
          setSchema(null);
          setError(formatApiError(error, t("forms.load_failed_desc")));
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
  }, [appId, serviceId]);

  if (loading) {
    return (
      <div className="card card--outline">
        <div className="stack">
          <div className="h3">{t("forms.loading_schema")}</div>
          <div className="text-muted">{t("forms.loading_schema_desc")}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card card--outline">
        <div className="stack">
          <div className="h3">{t("forms.load_failed_title")}</div>
          <div className="text-muted">{error}</div>
          <Link className="button button--primary" href="/admin/constructor">
            {t("forms.no_schema_cta")}
          </Link>
        </div>
      </div>
    );
  }

  if (!serviceId || !schema) {
    return (
      <div className="card card--outline">
        <div className="stack">
          <div className="h3">{t("forms.no_schema_title")}</div>
          <div className="text-muted">{t("forms.no_schema_desc")}</div>
          <Link className="button button--primary" href="/admin/constructor">
            {t("forms.no_schema_cta")}
          </Link>
        </div>
      </div>
    );
  }

  if (schema.nodes.length === 0) {
    return (
      <div className="card card--outline">
        <div className="stack">
          <div className="h3">{t("forms.no_nodes_title")}</div>
          <div className="text-muted">{t("forms.no_nodes_desc")}</div>
          <Link className="button button--primary" href="/admin/constructor">
            {t("forms.no_schema_cta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <FormRuntime appId={appId} schema={schema ?? EMPTY_SCHEMA} serviceId={serviceId} />
    </div>
  );
}
