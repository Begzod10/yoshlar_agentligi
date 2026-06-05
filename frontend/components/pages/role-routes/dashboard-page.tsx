"use client";

import { RolePageSwitch } from "@/components/pages/role-page-switch";
import { AdminDashboardPage } from "@/components/pages/roles/admin/dashboard-page";
import { DirektorDashboardPage } from "@/components/pages/roles/direktor/dashboard-page";
import { TashkilotDirektoriDashboardPage } from "@/components/pages/roles/tashkilot-direktori/dashboard-page";
import { MasulHodimDashboardPage } from "@/components/pages/roles/masul-hodim/dashboard-page";
import { ModeratorDashboardPage } from "@/components/pages/roles/moderator/dashboard-page";

export function RoleDashboardPage() {
  return (
    <RolePageSwitch
      components={{
        admin: AdminDashboardPage,
        direktor: DirektorDashboardPage,
        tashkilot_direktori: TashkilotDirektoriDashboardPage,
        masul_hodim: MasulHodimDashboardPage,
        moderator: ModeratorDashboardPage,
      }}
    />
  );
}
