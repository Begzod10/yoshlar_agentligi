import { PageDataLoader } from "@/components/app/page-data-loader";
import { UchrashuvlarPage } from "@/components/pages/uchrashuvlar-page";

export default function UchrashuvlarRoute() {
  return (
    <PageDataLoader resources={["youth", "masullar", "meetings"]}>
      <UchrashuvlarPage />
    </PageDataLoader>
  );
}
