import { PageDataLoader } from "@/components/app/page-data-loader";
import { RoleYoshlarPage } from "@/components/pages/role-routes/yoshlar-page";

export default function YoshlarRoute() {
  return (
    <PageDataLoader resources={["organizations", "masullar", "youth"]}>
      <RoleYoshlarPage />
    </PageDataLoader>
  );
}
