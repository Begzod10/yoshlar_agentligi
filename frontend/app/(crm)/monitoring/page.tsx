import { PageDataLoader } from "@/components/app/page-data-loader";
import { RoleMonitoringPage } from "@/components/pages/role-routes/monitoring-page";

export default function MonitoringRoute() {
  return (
    <PageDataLoader resources={["organizations", "masullar", "youth", "plans", "meetings"]}>
      <RoleMonitoringPage />
    </PageDataLoader>
  );
}
