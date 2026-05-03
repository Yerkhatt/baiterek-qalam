import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SectionHeading from "@/components/SectionHeading";
import ServiceCard from "@/components/ServiceCard";
import { fetchPublishedCatalog } from "@/lib/schemaApi";
import type { ServiceCardView } from "@/lib/serviceCatalog";
import { getPublishedSchemas, mapSummaryToCard } from "@/lib/serviceCatalog";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  let services: ServiceCardView[] = [];
  try {
    services = getPublishedSchemas(await fetchPublishedCatalog()).map(mapSummaryToCard);
  } catch {
    services = [];
  }

  return (
    <>
      <PublicHeader />
      <main className="section section--compact">
        <div className="container stack">
          <SectionHeading
            eyebrow={t("nav.services")}
            title={t("services.catalog_title")}
            subtitle={t("services.catalog_subtitle")}
          />
          <div className="grid services-catalog-grid">
            {services.length === 0 ? (
              <div className="card card--outline">
                <div className="stack">
                  <div className="h3">{t("forms.no_schema_title")}</div>
                  <div className="text-muted">{t("forms.no_schema_desc")}</div>
                </div>
              </div>
            ) : null}
            {services.map((service) => (
              <ServiceCard key={service.serviceId} href={service.href} title={service.title} />
            ))}
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
