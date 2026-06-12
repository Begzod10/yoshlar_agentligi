import { PageDataLoader } from "@/components/app/page-data-loader";
import { RoleDashboardPage } from "@/components/pages/role-routes/dashboard-page";

export default function DashboardRoute() {
  return (
    <PageDataLoader resources={["organizations", "masullar", "youth", "plans", "meetings"]}>
      <RoleDashboardPage />
    </PageDataLoader>
  );
}
