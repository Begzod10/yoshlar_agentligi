"use client";

import { RolePageSwitch } from "@/components/pages/role-page-switch";
import { AdminChiqarilganPage } from "@/components/pages/roles/admin/chiqarilgan-page";
import { DirektorChiqarilganPage } from "@/components/pages/roles/direktor/chiqarilgan-page";
import { TashkilotDirektoriChiqarilganPage } from "@/components/pages/roles/tashkilot-direktori/chiqarilgan-page";

export function RoleChiqarilganPage() {
  return (
    <RolePageSwitch
      components={{
        admin: AdminChiqarilganPage,
        direktor: DirektorChiqarilganPage,
        tashkilot_direktori: TashkilotDirektoriChiqarilganPage,
      }}
    />
  );
}
