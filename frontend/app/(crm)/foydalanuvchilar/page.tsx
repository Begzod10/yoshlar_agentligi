import { RoleGuard } from "@/components/auth/role-guard";
import { FoydalanuvchilarPage } from "@/components/pages/foydalanuvchilar-page";

export default function FoydalanuvchilarRoute() {
  return (
    <RoleGuard allow={["admin"]}>
      <FoydalanuvchilarPage />
    </RoleGuard>
  );
}
