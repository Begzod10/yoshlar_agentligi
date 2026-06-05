import { PageDataLoader } from "@/components/app/page-data-loader";
import { TashkilotlarPage } from "@/components/pages/tashkilotlar-page";

export default function TashkilotlarRoute() {
  return (
    <PageDataLoader resources={["organizations"]}>
      <TashkilotlarPage />
    </PageDataLoader>
  );
}
