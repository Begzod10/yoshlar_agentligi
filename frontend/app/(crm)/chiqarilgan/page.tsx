import { PageDataLoader } from "@/components/app/page-data-loader";
import { ChiqarilganPage } from "@/components/pages/chiqarilgan-page";

export default function ChiqarilganRoute() {
  return (
    <PageDataLoader initialParams={{ youth: { status: "graduated" } }} resources={["youth"]}>
      <ChiqarilganPage />
    </PageDataLoader>
  );
}
