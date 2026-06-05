"use client";

import { RolePageSwitch } from "@/components/pages/role-page-switch";
import { AdminMonitoringPage } from "@/components/pages/roles/admin/monitoring-page";
import { DirektorMonitoringPage } from "@/components/pages/roles/direktor/monitoring-page";
import { ModeratorMonitoringPage } from "@/components/pages/roles/moderator/monitoring-page";

export function RoleMonitoringPage() {
  return (
    <RolePageSwitch
      components={{
        admin: AdminMonitoringPage,
        direktor: DirektorMonitoringPage,
        moderator: ModeratorMonitoringPage,
      }}
    />
  );
}
