import { PageDataLoader } from "@/components/app/page-data-loader";
import { MonitoringPage } from "@/components/pages/monitoring-page";

export default function MonitoringRoute() {
  return (
    <PageDataLoader resources={["organizations", "masullar", "youth", "plans", "meetings"]}>
      <MonitoringPage />
    </PageDataLoader>
  );
}
