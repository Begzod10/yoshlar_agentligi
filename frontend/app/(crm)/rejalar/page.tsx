import { PageDataLoader } from "@/components/app/page-data-loader";
import { RoleRejalarPage } from "@/components/pages/role-routes/rejalar-page";

export default function RejalarRoute() {
  return (
    <PageDataLoader resources={["youth", "masullar", "plans"]}>
      <RoleRejalarPage />
    </PageDataLoader>
  );
}
