import { PageDataLoader } from "@/components/app/page-data-loader";
import { DashboardPage } from "@/components/pages/dashboard-page";

export default function DashboardRoute() {
  return (
    <PageDataLoader resources={["organizations", "masullar", "youth", "plans", "meetings"]}>
      <DashboardPage />
    </PageDataLoader>
  );
}
