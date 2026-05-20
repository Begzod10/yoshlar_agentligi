"use client";

import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { Bell, Search, Menu, User, LogOut, Settings, HelpCircle, MapPin } from "lucide-react";
import { DistrictFilter } from "@/components/ui/district-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  direktor: "Direktor",
  tashkilot_direktori: "Tashkilot direktori",
  masul_hodim: "Mas'ul hodim",
  moderator: "Moderator",
};

const roleBadgeColors: Record<UserRole, string> = {
  admin: "bg-chart-1 text-primary-foreground",
  direktor: "bg-chart-2 text-accent-foreground",
  tashkilot_direktori: "bg-chart-3 text-foreground",
  masul_hodim: "bg-chart-4 text-foreground",
  moderator: "bg-chart-5 text-primary-foreground",
};

interface TopbarProps {
  onLogout: () => void;
}

export function Topbar({ onLogout }: TopbarProps) {
  const { currentUser, sidebarOpen, setSidebarOpen, switchRole, setCurrentPage } = useApp();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-card border-b border-border transition-all duration-300",
        sidebarOpen ? "left-64" : "left-16"
      )}
    >
      <div className="flex h-full items-center justify-between px-4 gap-4">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Qidirish..."
              className="w-64 pl-9 h-9 bg-muted/50"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* District Filter */}
          <DistrictFilter className="hidden lg:flex" />

          {/* Role Switcher - For Demo */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:flex gap-2 bg-transparent">
                <Badge
                  className={cn(
                    "text-xs",
                    roleBadgeColors[currentUser?.role || "masul_hodim"]
                  )}
                >
                  {roleLabels[currentUser?.role || "masul_hodim"]}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Rolni almashtirish (Demo)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => switchRole("admin")}>
                <Badge className={cn("mr-2", roleBadgeColors.admin)}>Admin</Badge>
                Yoshlar agentligi
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchRole("direktor")}>
                <Badge className={cn("mr-2", roleBadgeColors.direktor)}>Direktor</Badge>
                Umumiy direktor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchRole("tashkilot_direktori")}>
                <Badge className={cn("mr-2", roleBadgeColors.tashkilot_direktori)}>
                  Tash. Dir.
                </Badge>
                Tashkilot direktori
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchRole("masul_hodim")}>
                <Badge className={cn("mr-2", roleBadgeColors.masul_hodim)}>
                  Mas'ul
                </Badge>
                Mas'ul hodim
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchRole("moderator")}>
                <Badge className={cn("mr-2", roleBadgeColors.moderator)}>
                  Moderator
                </Badge>
                Monitoring
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Bildirishnomalar</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">Yangi yosh qo'shildi</span>
                <span className="text-sm text-muted-foreground">
                  Aliyev Jasur tizimga qo'shildi
                </span>
                <span className="text-xs text-muted-foreground">2 soat oldin</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">Reja yakunlandi</span>
                <span className="text-sm text-muted-foreground">
                  "Kasb-hunar o'rgatish" rejasi tugallandi
                </span>
                <span className="text-xs text-muted-foreground">5 soat oldin</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">Uchrashuv eslatmasi</span>
                <span className="text-sm text-muted-foreground">
                  Ertaga soat 10:00 da uchrashuv
                </span>
                <span className="text-xs text-muted-foreground">1 kun oldin</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center justify-center text-primary">
                Barcha bildirishnomalarni ko'rish
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help */}
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(currentUser?.fullName || "User")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium leading-none">
                    {currentUser?.fullName}
                  </span>
                  <span className="text-xs text-muted-foreground leading-none mt-1">
                    {roleLabels[currentUser?.role || "masul_hodim"]}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mening hisobim</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Sozlamalar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Chiqish
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
