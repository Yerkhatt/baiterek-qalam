import { notFound } from "next/navigation";
import AdminDashboardHome from "@/components/AdminDashboardHome";
import RailLayout from "@/components/RailLayout";
import { getAdminNav } from "@/app/admin/nav";

const VARIANTS = ["v1", "v2", "v3", "v4", "v5"] as const;
type VariantId = (typeof VARIANTS)[number];

const TAGS: Record<VariantId, string> = {
  v1: "V1 · Warm editorial",
  v2: "V2 · Midnight command",
  v3: "V3 · Aurora glass",
  v4: "V4 · Neo-brutalist",
  v5: "V5 · Soft SaaS"
};

export function generateStaticParams() {
  return VARIANTS.map((variant) => ({ variant }));
}

export default function AdminDesignPreviewVariantPage({ params }: { params: { variant: string } }) {
  if (!VARIANTS.includes(params.variant as VariantId)) {
    notFound();
  }
  const variant = params.variant as VariantId;
  return (
    <RailLayout nav={getAdminNav()} railClassName={`admin-variant admin-variant--${variant}`}>
      <AdminDashboardHome variantTag={TAGS[variant]} />
    </RailLayout>
  );
}
