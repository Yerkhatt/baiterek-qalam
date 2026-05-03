import AdminDashboardHome from "@/components/AdminDashboardHome";
import RailLayout from "@/components/RailLayout";
import { getAdminNav } from "@/app/admin/nav";

export default function AdminPage() {
  return (
    <RailLayout nav={getAdminNav()}>
      <AdminDashboardHome />
    </RailLayout>
  );
}
