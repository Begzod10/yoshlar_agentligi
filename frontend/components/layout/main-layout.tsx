"use client";

import React from "react"

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
}

export function MainLayout({ children, currentPage, onPageChange, onLogout }: MainLayoutProps) {
  const { sidebarOpen } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} />
      <Topbar onLogout={onLogout} />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          sidebarOpen ? "pl-64" : "pl-16"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
