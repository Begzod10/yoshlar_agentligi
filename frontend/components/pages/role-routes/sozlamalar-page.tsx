"use client";

import { RolePageSwitch } from "@/components/pages/role-page-switch";
import { AdminSozlamalarPage } from "@/components/pages/roles/admin/sozlamalar-page";
import { DirektorSozlamalarPage } from "@/components/pages/roles/direktor/sozlamalar-page";
import { TashkilotDirektoriSozlamalarPage } from "@/components/pages/roles/tashkilot-direktori/sozlamalar-page";
import { MasulHodimSozlamalarPage } from "@/components/pages/roles/masul-hodim/sozlamalar-page";
import { ModeratorSozlamalarPage } from "@/components/pages/roles/moderator/sozlamalar-page";

export function RoleSozlamalarPage() {
  return (
    <RolePageSwitch
      components={{
        admin: AdminSozlamalarPage,
        direktor: DirektorSozlamalarPage,
        tashkilot_direktori: TashkilotDirektoriSozlamalarPage,
        masul_hodim: MasulHodimSozlamalarPage,
        moderator: ModeratorSozlamalarPage,
      }}
    />
  );
}
