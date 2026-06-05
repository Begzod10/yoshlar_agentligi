import { PageDataLoader } from "@/components/app/page-data-loader";
import { MasullarPage } from "@/components/pages/masullar-page";

export default function MasullarRoute() {
  return (
    <PageDataLoader resources={["organizations", "masullar"]}>
      <MasullarPage />
    </PageDataLoader>
  );
}
