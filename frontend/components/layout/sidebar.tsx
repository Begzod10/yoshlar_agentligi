"use client";

import React from "react"
import Link from "next/link";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { useAgencyStats, usePlans } from "@/lib/api/hooks/use-core-api";
import { APP_PAGE_HREFS, type AppPageId } from "@/lib/navigation";
import type { UserRole } from "@/lib/types";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCheck,
  FileText,
  Calendar,
  BarChart3,
  UserMinus,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Users2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  id: AppPageId;
  icon: React.ElementType;
  roles: UserRole[];
  getBadge?: () => number | undefined;
}

export function Sidebar({
  currentPage,
}: {
  currentPage: string;
}) {
  const { currentUser, sidebarOpen, setSidebarOpen } = useApp();

  // Real API counts for badges
  const { data: stats } = useAgencyStats();
  const { data: inProgressPlans } = usePlans({ status: "in_progress", page: 1, limit: 1 });

  const activeYouthCount   = stats?.activeYouth ?? 0;
  const inProgressPlanCount = inProgressPlans?.total ?? 0;
  // "scheduled" meetings ≈ totalMeetings - attendedMeetings
  const scheduledMeetingCount = stats
    ? Math.max(0, (stats.totalMeetings ?? 0) - (stats.attendedMeetings ?? 0))
    : 0;

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      id: "dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "direktor", "tashkilot_direktori", "masul_hodim", "moderator"],
    },
    {
      title: "Yoshlar",
      id: "yoshlar",
      icon: Users,
      roles: ["admin", "direktor", "tashkilot_direktori", "masul_hodim"],
      getBadge: () => activeYouthCount || undefined,
    },
    {
      title: "Tashkilotlar",
      id: "tashkilotlar",
      icon: Building2,
      roles: ["admin", "direktor", "moderator"],
    },
    {
      title: "Mas'ullar",
      id: "masullar",
      icon: UserCheck,
      roles: ["admin", "direktor", "tashkilot_direktori"],
    },
    {
      title: "Individual rejalar",
      id: "rejalar",
      icon: FileText,
      roles: ["admin", "direktor", "tashkilot_direktori", "masul_hodim"],
      getBadge: () => inProgressPlanCount || undefined,
    },
    {
      title: "Uchrashuvlar",
      id: "uchrashuvlar",
      icon: Calendar,
      roles: ["admin", "direktor", "tashkilot_direktori", "masul_hodim"],
      getBadge: () => scheduledMeetingCount || undefined,
    },
    {
      title: "Monitoring",
      id: "monitoring",
      icon: BarChart3,
      roles: ["admin", "direktor", "moderator"],
    },
    {
      title: "Chiqarilgan yoshlar",
      id: "chiqarilgan",
      icon: UserMinus,
      roles: ["admin", "direktor", "tashkilot_direktori"],
    },
    {
      title: "Foydalanuvchilar",
      id: "foydalanuvchilar",
      icon: Users2,
      roles: ["admin"],
    },
    {
      title: "Sozlamalar",
      id: "sozlamalar",
      icon: Settings,
      roles: ["admin", "direktor", "tashkilot_direktori", "masul_hodim", "moderator"],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(currentUser?.role || "masul_hodim")
  );

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
          // width
          sidebarOpen ? "w-64" : "w-64 lg:w-16",
          // mobile: hidden off-screen when closed, visible as overlay when open
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
                <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-none">Yoshlar AT</span>
                <span className="text-xs text-sidebar-foreground/70 leading-none mt-1">
                  Monitoring tizimi
                </span>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary mx-auto">
              <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <nav className="p-2 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const badge = item.getBadge?.();

              if (!sidebarOpen) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={APP_PAGE_HREFS[item.id]}
                        className={cn(
                          "w-full flex items-center justify-center h-10 rounded-md transition-colors relative",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {badge && (
                          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-sidebar-primary" />
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-2">
                      {item.title}
                      {badge && (
                        <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                          {badge}
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={APP_PAGE_HREFS[item.id]}
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 h-10 px-3 rounded-md transition-colors text-sm",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary font-medium"
                      : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.title}</span>
                  {badge && (
                    <span className="ml-auto text-xs bg-sidebar-primary/20 text-sidebar-primary px-2 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Toggle Button */}
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Yig'ish</span>
              </>
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
