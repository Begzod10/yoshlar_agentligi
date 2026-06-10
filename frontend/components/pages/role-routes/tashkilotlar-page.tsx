"use client";

import { RolePageSwitch } from "@/components/pages/role-page-switch";
import { AdminTashkilotlarPage } from "@/components/pages/roles/admin/tashkilotlar-page";
import { DirektorTashkilotlarPage } from "@/components/pages/roles/direktor/tashkilotlar-page";
import { ModeratorTashkilotlarPage } from "@/components/pages/roles/moderator/tashkilotlar-page";

export function RoleTashkilotlarPage() {
  return (
    <RolePageSwitch
      components={{
        admin: AdminTashkilotlarPage,
        direktor: DirektorTashkilotlarPage,
        moderator: ModeratorTashkilotlarPage,
      }}
    />
  );
}
