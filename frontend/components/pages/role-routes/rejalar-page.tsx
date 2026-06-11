"use client";

import { RolePageSwitch } from "@/components/pages/role-page-switch";
import { AdminRejalarPage } from "@/components/pages/roles/admin/rejalar-page";
import { DirektorRejalarPage } from "@/components/pages/roles/direktor/rejalar-page";
import { TashkilotDirektoriRejalarPage } from "@/components/pages/roles/tashkilot-direktori/rejalar-page";
import { MasulHodimRejalarPage } from "@/components/pages/roles/masul-hodim/rejalar-page";

export function RoleRejalarPage() {
  return (
    <RolePageSwitch
      components={{
        admin: AdminRejalarPage,
        direktor: DirektorRejalarPage,
        tashkilot_direktori: TashkilotDirektoriRejalarPage,
        masul_hodim: MasulHodimRejalarPage,
      }}
    />
  );
}
