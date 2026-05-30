"use client";

import { AppProvider, useApp } from "@/lib/app-context";
import { MainLayout } from "@/components/layout/main-layout";
import { DashboardPage } from "@/components/pages/dashboard-page";
import { YoshlarPage } from "@/components/pages/yoshlar-page";
import { TashkilotlarPage } from "@/components/pages/tashkilotlar-page";
import { MasullarPage } from "@/components/pages/masullar-page";
import { RejalarPage } from "@/components/pages/rejalar-page";
import { UchrashuvlarPage } from "@/components/pages/uchrashuvlar-page";
import { MonitoringPage } from "@/components/pages/monitoring-page";
import { ChiqarilganPage } from "@/components/pages/chiqarilgan-page";
import { FoydalanuvchilarPage } from "@/components/pages/foydalanuvchilar-page";
import { SozlamalarPage } from "@/components/pages/sozlamalar-page";
import { LoginPage } from "@/components/pages/login-page";
import { CategorySelectionPage, type YouthCategory } from "@/components/pages/category-selection-page";
import { ToastContainer } from "@/components/ui/toast-container";
import { AIChat } from "@/components/ai/ai-chat";

function AppContent() {
  const { currentUser, login, logout, currentPage, setCurrentPage, selectedYouthCategory, setSelectedYouthCategory } = useApp();

  const handleCategorySelect = (category: YouthCategory) => {
    setSelectedYouthCategory(category);
  };

  const handleLogin = (email: string) => {
    login(email, "");
  };

  const handleLogout = () => {
    logout();
  };

  // Step 1: Show category selection if no category is selected
  if (!selectedYouthCategory) {
    return <CategorySelectionPage onCategorySelect={handleCategorySelect} />;
  }

  // Step 2: Show login page if not authenticated
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "yoshlar":
        return <YoshlarPage />;
      case "tashkilotlar":
        return <TashkilotlarPage />;
      case "masullar":
        return <MasullarPage />;
      case "rejalar":
        return <RejalarPage />;
      case "uchrashuvlar":
        return <UchrashuvlarPage />;
      case "monitoring":
        return <MonitoringPage />;
      case "chiqarilgan":
        return <ChiqarilganPage />;
      case "foydalanuvchilar":
        return <FoydalanuvchilarPage />;
      case "sozlamalar":
        return <SozlamalarPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <MainLayout
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={handleLogout}
      >
        {renderPage()}
      </MainLayout>
      <ToastContainer />
      <AIChat />
    </>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
