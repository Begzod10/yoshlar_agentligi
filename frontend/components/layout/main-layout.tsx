"use client";

import React from "react"

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface MainLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export function MainLayout({ children, onLogout }: MainLayoutProps) {
  const { currentPage, sidebarOpen, setSidebarOpen } = useApp();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar currentPage={currentPage} />
      <Topbar onLogout={onLogout} />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          "pl-0",
          sidebarOpen ? "lg:pl-64" : "lg:pl-16"
        )}
      >
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
