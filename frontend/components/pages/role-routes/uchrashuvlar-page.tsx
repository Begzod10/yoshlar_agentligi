"use client";

import { RolePageSwitch } from "@/components/pages/role-page-switch";
import { AdminUchrashuvlarPage } from "@/components/pages/roles/admin/uchrashuvlar-page";
import { DirektorUchrashuvlarPage } from "@/components/pages/roles/direktor/uchrashuvlar-page";
import { TashkilotDirektoriUchrashuvlarPage } from "@/components/pages/roles/tashkilot-direktori/uchrashuvlar-page";
import { MasulHodimUchrashuvlarPage } from "@/components/pages/roles/masul-hodim/uchrashuvlar-page";

export function RoleUchrashuvlarPage() {
  return (
    <RolePageSwitch
      components={{
        admin: AdminUchrashuvlarPage,
        direktor: DirektorUchrashuvlarPage,
        tashkilot_direktori: TashkilotDirektoriUchrashuvlarPage,
        masul_hodim: MasulHodimUchrashuvlarPage,
      }}
    />
  );
}
