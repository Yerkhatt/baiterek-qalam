import Constructor from "@/components/constructor";

type AdminWorkflowBuilderPageProps = {
  params: { serviceId: string };
};

export default function AdminWorkflowBuilderPage({ params }: AdminWorkflowBuilderPageProps) {
  const { serviceId } = params;
  return <Constructor initialServiceId={serviceId} />;
}
