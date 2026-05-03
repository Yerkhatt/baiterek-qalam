import Link from "next/link";
import { migrateSchema } from "@qalam/form-engine";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import ServiceBriefingGate from "@/components/ServiceBriefingGate";
import { fetchSchema } from "@/lib/schemaApi";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({ params }: { params: { serviceId: string } }) {
  const serviceId = decodeURIComponent(params.serviceId);
  const raw = await fetchSchema(serviceId);

  if (!raw) {
    return (
      <>
        <PublicHeader />
        <main className="section">
          <div className="container stack">
            <div className="card card--outline">
              <div className="stack">
                <div className="h3">{t("forms.no_schema_title")}</div>
                <div className="text-muted">{t("forms.no_schema_desc")}</div>
                <Link className="button button--primary" href="/admin/constructor">
                  {t("forms.no_schema_cta")}
                </Link>
              </div>
            </div>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  const schema = migrateSchema(raw);
  const briefing = (schema.metadata?.visitorBriefing ?? "").trim();

  return (
    <>
      <PublicHeader />
      <main className="section">
        <div className="container stack">
          <ServiceBriefingGate serviceId={serviceId} schema={schema} briefing={briefing} />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
