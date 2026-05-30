"use client";

import React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Shield, Eye, EyeOff, LogIn, Building2, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/errors";

interface LoginPageProps {
  onLogin: (email: string) => void;
}

interface DemoAccount {
  role: string;
  roleUz: string;
  email: string;
  password: string;
  description: string;
  color: string;
  district: string | null;
}

const demoAccounts: readonly DemoAccount[] = [
  {
    role: "Admin",
    roleUz: "Administrator",
    email: "admin@yoshlar.uz",
    password: "admin123",
    description: "Tizimning to'liq nazorati - barcha 14 tuman",
    color: "bg-primary",
    district: null,
  },
  {
    role: "Director",
    roleUz: "Yoshlar agentligi direktori",
    email: "direktor@yoshlar.uz",
    password: "direktor123",
    description: "Strategik nazorat - barcha tumanlar",
    color: "bg-accent",
    district: null,
  },
  {
    role: "Org Director",
    roleUz: "Bekobod tumani direktori",
    email: "bekobod@yoshlar.uz",
    password: "tashkilot123",
    description: "Faqat Bekobod tumani",
    color: "bg-chart-3",
    district: "Bekobod tumani",
  },
  {
    role: "Masul",
    roleUz: "Mas'ul hodim",
    email: "masul1@yoshlar.uz",
    password: "masul123",
    description: "Bekobod tumani - biriktirilgan yoshlar",
    color: "bg-chart-4",
    district: "Bekobod tumani",
  },
  {
    role: "Moderator",
    roleUz: "Moderator",
    email: "moderator@yoshlar.uz",
    password: "moderator123",
    description: "Monitoring va tahlil - umumiy statistika",
    color: "bg-chart-5",
    district: null,
  },
];

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "invalid_credentials") return "Noto'g'ri email yoki parol";
    if (err.isUnauthorized) return "Avtorizatsiyadan o'tilmadi";
    return err.message;
  }
  return "Tarmoq xatosi. Backend ishlamayotgan bo'lishi mumkin.";
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { login } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function attemptLogin(creds: { email: string; password: string }): Promise<void> {
    setError("");
    setIsLoading(true);
    try {
      await login(creds);
      onLogin(creds.email);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void attemptLogin({ email, password });
  };

  const handleQuickLogin = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    void attemptLogin({ email: account.email, password: account.password });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Shield className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">
              Yoshlar Agentligi
            </h1>
            <p className="text-xs text-sidebar-foreground/70">
              Monitoring tizimi
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-sidebar-foreground leading-tight text-balance">
            Muammoli yoshlar bilan ishlash va monitoring axborot tizimi
          </h2>
          <p className="text-sidebar-foreground/70 text-lg">
            Yoshlar bilan ishlash jarayonini raqamlashtirish va monitoring
            qilish uchun yagona platforma
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-4">
              <Building2 className="h-8 w-8 text-sidebar-primary" />
              <div>
                <p className="text-2xl font-bold text-sidebar-foreground">14</p>
                <p className="text-xs text-sidebar-foreground/70">Tuman</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-4">
              <Users className="h-8 w-8 text-sidebar-primary" />
              <div>
                <p className="text-2xl font-bold text-sidebar-foreground">
                  578+
                </p>
                <p className="text-xs text-sidebar-foreground/70">Yoshlar</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-sidebar-foreground/50">
          2024 Yoshlar ishlari agentligi. Barcha huquqlar himoyalangan.
        </p>
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-border bg-card shadow-lg">
            <CardHeader className="space-y-4 pb-4">
              <div className="flex lg:hidden items-center gap-3 justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                  <Shield className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-foreground">
                  Tizimga kirish
                </h1>
                <p className="text-muted-foreground mt-2">
                  Hisobingizga kirish uchun ma'lumotlaringizni kiriting
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@yoshlar.uz"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    className="h-11"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Parol</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Parolingizni kiriting"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      className="h-11 pr-10"
                      autoComplete="current-password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Kirish...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Kirish
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Demo Accounts */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-foreground">Demo hisoblar</p>
              <p className="text-xs text-muted-foreground">
                Tizimni sinab ko'rish uchun quyidagi hisoblardan birini tanlang
              </p>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleQuickLogin(account)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      account.color,
                    )}
                  >
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{account.roleUz}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {account.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
