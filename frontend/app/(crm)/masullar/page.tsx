import { PageDataLoader } from "@/components/app/page-data-loader";
import { RoleMasullarPage } from "@/components/pages/role-routes/masullar-page";

export default function MasullarRoute() {
  return (
    <PageDataLoader resources={["organizations", "masullar"]}>
      <RoleMasullarPage />
    </PageDataLoader>
  );
}
