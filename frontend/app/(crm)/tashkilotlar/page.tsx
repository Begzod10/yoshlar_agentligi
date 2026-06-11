import { PageDataLoader } from "@/components/app/page-data-loader";
import { RoleTashkilotlarPage } from "@/components/pages/role-routes/tashkilotlar-page";

export default function TashkilotlarRoute() {
  return (
    <PageDataLoader resources={["organizations"]}>
      <RoleTashkilotlarPage />
    </PageDataLoader>
  );
}
