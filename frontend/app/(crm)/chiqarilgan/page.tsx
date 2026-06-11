import { PageDataLoader } from "@/components/app/page-data-loader";
import { RoleChiqarilganPage } from "@/components/pages/role-routes/chiqarilgan-page";

export default function ChiqarilganRoute() {
  return (
    <PageDataLoader initialParams={{ youth: { status: "graduated" } }} resources={["youth"]}>
      <RoleChiqarilganPage />
    </PageDataLoader>
  );
}
