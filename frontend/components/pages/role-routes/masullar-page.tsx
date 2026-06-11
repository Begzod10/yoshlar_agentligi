"use client";

import { RolePageSwitch } from "@/components/pages/role-page-switch";
import { AdminMasullarPage } from "@/components/pages/roles/admin/masullar-page";
import { DirektorMasullarPage } from "@/components/pages/roles/direktor/masullar-page";
import { TashkilotDirektoriMasullarPage } from "@/components/pages/roles/tashkilot-direktori/masullar-page";

export function RoleMasullarPage() {
  return (
    <RolePageSwitch
      components={{
        admin: AdminMasullarPage,
        direktor: DirektorMasullarPage,
        tashkilot_direktori: TashkilotDirektoriMasullarPage,
      }}
    />
  );
}
