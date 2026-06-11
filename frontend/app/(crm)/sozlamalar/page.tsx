import { Suspense } from "react";
import { RoleSozlamalarPage } from "@/components/pages/role-routes/sozlamalar-page";

export default function SozlamalarRoute() {
  return (
    <Suspense>
      <RoleSozlamalarPage />
    </Suspense>
  );
}
