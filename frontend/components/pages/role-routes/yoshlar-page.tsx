"use client";

import { RolePageSwitch } from "@/components/pages/role-page-switch";
import { AdminYoshlarPage } from "@/components/pages/roles/admin/yoshlar-page";
import { DirektorYoshlarPage } from "@/components/pages/roles/direktor/yoshlar-page";
import { TashkilotDirektoriYoshlarPage } from "@/components/pages/roles/tashkilot-direktori/yoshlar-page";
import { MasulHodimYoshlarPage } from "@/components/pages/roles/masul-hodim/yoshlar-page";

export function RoleYoshlarPage() {
  return (
    <RolePageSwitch
      components={{
        admin: AdminYoshlarPage,
        direktor: DirektorYoshlarPage,
        tashkilot_direktori: TashkilotDirektoriYoshlarPage,
        masul_hodim: MasulHodimYoshlarPage,
      }}
    />
  );
}
