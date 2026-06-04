import { PageDataLoader } from "@/components/app/page-data-loader";
import { RejalarPage } from "@/components/pages/rejalar-page";

export default function RejalarRoute() {
  return (
    <PageDataLoader resources={["youth", "masullar", "plans"]}>
      <RejalarPage />
    </PageDataLoader>
  );
}
