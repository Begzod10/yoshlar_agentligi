"use client";

import { useEffect } from "react";
import type React from "react";
import { useApp } from "@/lib/app-context";
import type { UserRole } from "@/lib/types";

interface RoleGuardProps {
  allow: UserRole[];
  children: React.ReactNode;
  fallbackPage?: string;
}

export function RoleGuard({
  allow,
  children,
  fallbackPage = "dashboard",
}: RoleGuardProps) {
  const { currentUser, setCurrentPage } = useApp();
  const isAllowed = currentUser ? allow.includes(currentUser.role) : false;

  useEffect(() => {
    if (currentUser && !isAllowed) {
      setCurrentPage(fallbackPage);
    }
  }, [currentUser, fallbackPage, isAllowed, setCurrentPage]);

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
