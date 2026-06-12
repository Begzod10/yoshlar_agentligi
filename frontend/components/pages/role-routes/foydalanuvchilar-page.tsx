"use client";

import { RolePageSwitch } from "@/components/pages/role-page-switch";
import { AdminFoydalanuvchilarPage } from "@/components/pages/roles/admin/foydalanuvchilar-page";

export function RoleFoydalanuvchilarPage() {
  return <RolePageSwitch components={{ admin: AdminFoydalanuvchilarPage }} />;
}
