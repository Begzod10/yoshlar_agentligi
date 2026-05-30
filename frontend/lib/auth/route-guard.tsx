"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/api/types";

interface RouteGuardProps {
  allow?: readonly UserRole[];
  children: ReactNode;
  loadingFallback?: ReactNode;
}

export function RouteGuard({ allow, children, loadingFallback = null }: RouteGuardProps) {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isAllowed = !!user && (!allow || allow.includes(user.role));

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname ?? "/")}`);
      return;
    }
    if (allow && !allow.includes(user.role)) {
      router.replace("/");
    }
  }, [user, isLoading, allow, router, pathname]);

  if (isLoading) return <>{loadingFallback}</>;
  if (!isAllowed) return null;
  return <>{children}</>;
}
