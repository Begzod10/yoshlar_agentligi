"use client";

import { useEffect, type ComponentType } from "react";

import { useApp } from "@/lib/app-context";
import type { UserRole } from "@/lib/types";

type RoleComponentMap = Partial<Record<UserRole, ComponentType>>;

interface RolePageSwitchProps {
  components: RoleComponentMap;
  fallbackPage?: string;
}

export function RolePageSwitch({ components, fallbackPage = "dashboard" }: RolePageSwitchProps) {
  const { currentUser, setCurrentPage } = useApp();
  const Component = currentUser ? components[currentUser.role] : undefined;

  useEffect(() => {
    if (currentUser && !Component) {
      setCurrentPage(fallbackPage);
    }
  }, [Component, currentUser, fallbackPage, setCurrentPage]);

  if (!Component) return null;

  return <Component />;
}
