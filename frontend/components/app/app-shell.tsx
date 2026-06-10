"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AIChat } from "@/components/ai/ai-chat";
import { MainLayout } from "@/components/layout/main-layout";
import { CategorySelectionPage, type YouthCategory } from "@/components/pages/category-selection-page";
import { LoginPage } from "@/components/pages/login-page";
import { ToastContainer } from "@/components/ui/toast-container";
import { AppProvider, useApp } from "@/lib/app-context";
import { useSession } from "@/lib/auth/session";

function AppShellContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    currentUser,
    login,
    logout,
    selectedYouthCategory,
    setSelectedYouthCategory,
  } = useApp();
  const { user: sessionUser, isLoading: isSessionLoading, logout: sessionLogout } = useSession();

  useEffect(() => {
    if (sessionUser && !selectedYouthCategory) {
      setSelectedYouthCategory("boshqa");
    }
  }, [sessionUser, selectedYouthCategory, setSelectedYouthCategory]);

  const handleCategorySelect = (category: YouthCategory) => {
    setSelectedYouthCategory(category);
  };

  const handleLogin = (email: string) => {
    login(email, "");
  };

  const handleLogout = () => {
    void submitLogout();
  };

  const submitLogout = async () => {
    await sessionLogout();
    logout();
    router.replace("/dashboard");
  };

  if (isSessionLoading || (sessionUser && !currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Yuklanmoqda...
      </div>
    );
  }

  if (!selectedYouthCategory) {
    return <CategorySelectionPage onCategorySelect={handleCategorySelect} />;
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <MainLayout onLogout={handleLogout}>{children}</MainLayout>
      <ToastContainer />
      <AIChat />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <AppShellContent>{children}</AppShellContent>
    </AppProvider>
  );
}
