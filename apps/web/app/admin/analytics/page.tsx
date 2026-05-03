import RailLayout from "@/components/RailLayout";
import SectionHeading from "@/components/SectionHeading";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { t } from "@/lib/i18n";
import { getAdminNav } from "@/app/admin/nav";

export default function AdminAnalyticsPage() {
  return (
    <RailLayout nav={getAdminNav()}>
      <div className="stack">
        <SectionHeading title={t("admin.sections.analytics.title")} />
        <AnalyticsDashboard />
      </div>
    </RailLayout>
  );
}
