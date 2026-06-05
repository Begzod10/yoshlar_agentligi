import { PageDataLoader } from "@/components/app/page-data-loader";
import { YoshlarPage } from "@/components/pages/yoshlar-page";

export default function YoshlarRoute() {
  return (
    <PageDataLoader resources={["organizations", "masullar", "youth"]}>
      <YoshlarPage />
    </PageDataLoader>
  );
}
