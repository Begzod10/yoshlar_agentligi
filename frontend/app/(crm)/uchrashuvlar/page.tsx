import { PageDataLoader } from "@/components/app/page-data-loader";
import { RoleUchrashuvlarPage } from "@/components/pages/role-routes/uchrashuvlar-page";

export default function UchrashuvlarRoute() {
  return (
    <PageDataLoader resources={["youth", "masullar", "meetings"]}>
      <RoleUchrashuvlarPage />
    </PageDataLoader>
  );
}
