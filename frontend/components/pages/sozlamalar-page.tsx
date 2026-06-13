"use client";

import React from "react"

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import {
  useAdminAuditLog,
  useAdminBackups,
  useAdminSystemInfo,
  useAdminTableCounts,
  useCreateBackup,
  useRestoreBackup,
  useToggleMaintenance,
} from "@/lib/api/hooks/use-admin";
import {
  downloadReport,
  useChangePassword,
  useProfile,
  useProfileNotifications,
  useProfilePreferences,
  useProfileSessions,
  useRevokeOtherProfileSessions,
  useRevokeProfileSession,
  useUpdateProfile,
  useUpdateProfileNotifications,
  useUpdateProfilePreferences,
} from "@/lib/api/hooks/use-core-api";
import type { NotificationPreferences } from "@/lib/api/types";
import { TOSHKENT_VILOYATI_DISTRICTS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Mail,
  Phone,
  Building,
  Key,
  Eye,
  EyeOff,
  MapPin,
  Moon,
  Sun,
  Monitor,
  Database,
  Download,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

const roleLabels = {
  admin: "Administrator",
  direktor: "Direktor",
  tashkilot_direktori: "Tashkilot direktori",
  masul_hodim: "Mas'ul hodim",
  moderator: "Moderator",
};

export function SozlamalarPage() {
  const { currentUser, showToast } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") ?? "profile");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const isAdmin = currentUser?.role === "admin";
  const [auditPage, setAuditPage] = useState(1);
  const auditLog = useAdminAuditLog({ page: auditPage, limit: 50, enabled: isAdmin });
  const systemInfo = useAdminSystemInfo(isAdmin);
  const tableCounts = useAdminTableCounts(isAdmin);
  const backups = useAdminBackups(isAdmin);
  const toggleMaintenance = useToggleMaintenance();
  const createBackup = useCreateBackup();
  const restoreBackup = useRestoreBackup();
  const profile = useProfile();
  const profilePreferences = useProfilePreferences();
  const profileNotifications = useProfileNotifications();
  const profileSessions = useProfileSessions();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const updateProfilePreferences = useUpdateProfilePreferences();
  const updateProfileNotifications = useUpdateProfileNotifications();
  const revokeProfileSession = useRevokeProfileSession();
  const revokeOtherProfileSessions = useRevokeOtherProfileSessions();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    dailyReport: true,
    weeklyReport: false,
    youthUpdates: true,
    planReminders: true,
    meetingReminders: true,
  });
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("uz");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [reportDistrict, setReportDistrict] = useState("Bekobod tumani");
  const auditTotal = auditLog.data?.total ?? 0;
  const auditLimit = auditLog.data?.limit ?? 50;
  const currentAuditPage = auditLog.data?.page ?? auditPage;
  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / auditLimit));
  const firstAuditRow = auditTotal === 0 ? 0 : (currentAuditPage - 1) * auditLimit + 1;
  const lastAuditRow = Math.min(currentAuditPage * auditLimit, auditTotal);
  const profileData = profile.data ?? currentUser;

  useEffect(() => {
    if (profilePreferences.data) {
      setTheme(profilePreferences.data.theme);
      setLanguage(profilePreferences.data.language);
      setNotifications(profilePreferences.data.notifications);
    }
  }, [profilePreferences.data]);

  useEffect(() => {
    if (profileNotifications.data) {
      setNotifications(profileNotifications.data);
    }
  }, [profileNotifications.data]);

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await updateProfile.mutateAsync({
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") || "") || null,
      });
      showToast("Profil muvaffaqiyatli saqlandi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Profil saqlanmadi", "error");
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      showToast("Yangi parollar mos kelmadi", "error");
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      e.currentTarget.reset();
      showToast("Parol muvaffaqiyatli o'zgartirildi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Parol o'zgartirilmadi", "error");
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateProfileNotifications.mutateAsync(notifications);
      showToast("Bildirishnoma sozlamalari saqlandi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Bildirishnomalar saqlanmadi", "error");
    }
  };

  const handleThemeChange = (nextTheme: "light" | "dark" | "system") => {
    setTheme(nextTheme);
  };

  const handleLanguageChange = (nextLanguage: "uz" | "ru" | "en") => {
    setLanguage(nextLanguage);
  };

  const handleSaveAppearance = async () => {
    try {
      await updateProfilePreferences.mutateAsync({ theme, language });
      showToast("Ko'rinish sozlamalari saqlandi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Saqlanmadi", "error");
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeProfileSession.mutateAsync(sessionId);
      showToast("Sessiya tugatildi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Sessiya tugatilmadi", "error");
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      const result = await revokeOtherProfileSessions.mutateAsync();
      showToast(`${result.revoked} ta sessiya tugatildi`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Sessiyalar tugatilmadi", "error");
    }
  };

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  const formatBytes = (value: number) => {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${Math.round(value / 1024 / 1024)} MB`;
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    try {
      await toggleMaintenance.mutateAsync({
        enabled,
        message: maintenanceMessage || null,
      });
      showToast("Maintenance holati yangilandi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Maintenance yangilanmadi", "error");
    }
  };

  const handleCreateBackup = async () => {
    try {
      await createBackup.mutateAsync();
      showToast("Backup yaratildi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Backup yaratilmadi", "error");
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    try {
      await restoreBackup.mutateAsync(backupId);
      showToast("Backup restore qilindi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Restore bajarilmadi", "error");
    }
  };

  const handleDownloadReport = async (kind: "agency" | "district") => {
    try {
      if (kind === "agency") {
        await downloadReport.agency(false);
      } else {
        await downloadReport.district(reportDistrict, false);
      }
      showToast("Hisobot yuklab olindi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Hisobot yuklanmadi", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sozlamalar</h1>
        <p className="text-muted-foreground">
          Tizim va shaxsiy sozlamalarni boshqarish
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); router.replace(`?tab=${v}`, { scroll: false }); }} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Bildirishnomalar
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Xavfsizlik
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Ko'rinish
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="audit" className="gap-2">
                <Shield className="h-4 w-4" />
                Audit log
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-2">
                <Monitor className="h-4 w-4" />
                System
              </TabsTrigger>
              <TabsTrigger value="backups" className="gap-2">
                <Database className="h-4 w-4" />
                Backups
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shaxsiy ma'lumotlar</CardTitle>
              <CardDescription>
                Profilingiz haqidagi asosiy ma'lumotlar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-semibold">
                    {profileData?.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2) || "AD"}
                  </div>
                  <div className="space-y-2">
                    <Button type="button" variant="outline" size="sm">
                      Rasm yuklash
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG yoki GIF. Maksimum 2MB
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">To'liq ism</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      defaultValue={profileData?.fullName}
                      placeholder="F.I.O."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={profileData?.email}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        defaultValue={profileData?.phone ?? ""}
                        placeholder="+998 XX XXX XX XX"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50">
                      <Badge variant="secondary">
                        {profileData?.role ? roleLabels[profileData.role as keyof typeof roleLabels] : "-"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {profileData?.districtId && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tuman</Label>
                      <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{profileData.districtId}</span>
                      </div>
                    </div>
                    {currentUser?.organizationName && (
                      <div className="space-y-2">
                        <Label>Tashkilot</Label>
                        <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{currentUser.organizationName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateProfile.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Saqlash
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bildirishnoma kanallari</CardTitle>
              <CardDescription>
                Bildirishnomalarni qaysi kanallar orqali olishni sozlang
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email bildirishnomalar</Label>
                  <p className="text-sm text-muted-foreground">
                    Muhim yangilanishlarni email orqali oling
                  </p>
                </div>
                <Switch
                  checked={notifications.emailEnabled}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, emailEnabled: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">SMS bildirishnomalar</Label>
                  <p className="text-sm text-muted-foreground">
                    Shoshilinch xabarlarni SMS orqali oling
                  </p>
                </div>
                <Switch
                  checked={notifications.smsEnabled}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, smsEnabled: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Push bildirishnomalar</Label>
                  <p className="text-sm text-muted-foreground">
                    Brauzer orqali bildirishnomalar oling
                  </p>
                </div>
                <Switch
                  checked={notifications.pushEnabled}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, pushEnabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bildirishnoma turlari</CardTitle>
              <CardDescription>
                Qaysi turdagi bildirishnomalarni olishni tanlang
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Yoshlar yangilanishlari</Label>
                  <p className="text-sm text-muted-foreground">
                    Yoshlar holatidagi o'zgarishlar haqida xabar
                  </p>
                </div>
                <Switch
                  checked={notifications.youthUpdates}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, youthUpdates: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Reja eslatmalari</Label>
                  <p className="text-sm text-muted-foreground">
                    Rejalar muddati yaqinlashganda eslatma
                  </p>
                </div>
                <Switch
                  checked={notifications.planReminders}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, planReminders: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Uchrashuv eslatmalari</Label>
                  <p className="text-sm text-muted-foreground">
                    Uchrashuvlar oldidan eslatma
                  </p>
                </div>
                <Switch
                  checked={notifications.meetingReminders}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, meetingReminders: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Kunlik hisobot</Label>
                  <p className="text-sm text-muted-foreground">
                    Har kuni faoliyat xulosasi
                  </p>
                </div>
                <Switch
                  checked={notifications.dailyReport}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, dailyReport: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Haftalik hisobot</Label>
                  <p className="text-sm text-muted-foreground">
                    Har hafta umumiy statistika
                  </p>
                </div>
                <Switch
                  checked={notifications.weeklyReport}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, weeklyReport: checked })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={updateProfileNotifications.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Saqlash
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parolni o'zgartirish</CardTitle>
              <CardDescription>
                Xavfsizlik uchun muntazam parol almashtirishni tavsiya qilamiz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Joriy parol</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type={showPassword ? "text" : "password"}
                      className="pl-9 pr-10"
                      placeholder="Joriy parolni kiriting"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Yangi parol</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      className="pl-9 pr-10"
                      placeholder="Yangi parolni kiriting"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Parolni tasdiqlang</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showNewPassword ? "text" : "password"}
                      className="pl-9"
                      placeholder="Yangi parolni qayta kiriting"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={changePassword.isPending}>
                    <Shield className="mr-2 h-4 w-4" />
                    Parolni o'zgartirish
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sessiyalar</CardTitle>
              <CardDescription>
                Faol sessiyalarni boshqaring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileSessions.isLoading && (
                <p className="text-sm text-muted-foreground">Sessiyalar yuklanmoqda...</p>
              )}
              {profileSessions.isError && (
                <p className="text-sm text-destructive">Sessiyalar yuklanmadi</p>
              )}
              {profileSessions.data?.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Monitor className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">{session.ip ?? "Noma'lum IP"}</p>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {session.userAgent ?? "Noma'lum qurilma"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Oxirgi faollik: {formatDate(session.lastActiveAt)}
                      </p>
                    </div>
                  </div>
                  {session.isCurrent ? (
                    <Badge className="w-fit bg-accent/10 text-accent">Faol</Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit bg-transparent"
                      disabled={revokeProfileSession.isPending}
                      onClick={() => void handleRevokeSession(session.id)}
                    >
                      Tugatish
                    </Button>
                  )}
                </div>
              ))}
              {profileSessions.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">Faol sessiyalar topilmadi</p>
              )}
              <Button
                variant="outline"
                className="w-full bg-transparent"
                disabled={revokeOtherProfileSessions.isPending}
                onClick={() => void handleRevokeOtherSessions()}
              >
                Barcha boshqa sessiyalarni tugatish
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ko'rinish sozlamalari</CardTitle>
              <CardDescription>
                Interfeys ko'rinishini moslashtiring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Mavzu</Label>
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    type="button"
                    variant={theme === "light" ? "default" : "outline"}
                    className="h-auto flex-col gap-2 py-4"
                    onClick={() => handleThemeChange("light")}
                  >
                    <Sun className="h-5 w-5" />
                    <span>Yorug'</span>
                  </Button>
                  <Button
                    type="button"
                    variant={theme === "dark" ? "default" : "outline"}
                    className="h-auto flex-col gap-2 py-4"
                    onClick={() => handleThemeChange("dark")}
                  >
                    <Moon className="h-5 w-5" />
                    <span>Qorong'u</span>
                  </Button>
                  <Button
                    type="button"
                    variant={theme === "system" ? "default" : "outline"}
                    className="h-auto flex-col gap-2 py-4"
                    onClick={() => handleThemeChange("system")}
                  >
                    <Monitor className="h-5 w-5" />
                    <span>Tizim</span>
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="language">Til</Label>
                <Select value={language} onValueChange={(value) => handleLanguageChange(value as "uz" | "ru" | "en")}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uz">O'zbek</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveAppearance} disabled={updateProfilePreferences.isPending}>
                  {updateProfilePreferences.isPending ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Audit log</CardTitle>
                <CardDescription>
                  Admin harakatlari va muhim tizim voqealari
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditLog.isLoading && (
                    <p className="text-sm text-muted-foreground">Audit log yuklanmoqda...</p>
                  )}
                  {auditLog.isError && (
                    <p className="text-sm text-destructive">Audit log yuklanmadi</p>
                  )}
                  {auditLog.data?.data.map((row) => (
                    <div
                      key={row.id}
                      className="grid gap-3 rounded-md border p-4 md:grid-cols-[180px_1fr_180px]"
                    >
                      <Badge variant="outline" className="w-fit">
                        {row.action}
                      </Badge>
                      <div>
                        <p className="font-medium">{row.entityType}</p>
                        <p className="text-sm text-muted-foreground">
                          Actor: {row.userId}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground md:text-right">
                        {formatDate(row.createdAt)}
                      </p>
                    </div>
                  ))}
                  {auditLog.data?.data.length === 0 && (
                    <p className="text-sm text-muted-foreground">Audit yozuvlari topilmadi</p>
                  )}
                  {auditTotal > auditLimit && (
                    <div className="flex flex-col gap-3 border-t pt-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        {firstAuditRow}-{lastAuditRow} / {auditTotal} ta
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 bg-transparent"
                          disabled={currentAuditPage <= 1}
                          onClick={() => setAuditPage((current) => Math.max(1, current - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Oldingi
                        </Button>
                        <span className="min-w-16 text-center">
                          {currentAuditPage}/{auditTotalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 bg-transparent"
                          disabled={currentAuditPage >= auditTotalPages}
                          onClick={() => setAuditPage((current) => current + 1)}
                        >
                          Keyingi
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System</CardTitle>
                <CardDescription>
                  Admin uchun tizim darajasidagi boshqaruvlar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Maintenance mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Foydalanuvchilar uchun tizimga kirishni vaqtincha cheklash
                    </p>
                  </div>
                  <Switch
                    checked={systemInfo.data?.maintenanceMode ?? false}
                    onCheckedChange={handleToggleMaintenance}
                    disabled={toggleMaintenance.isPending || systemInfo.isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenanceMessage">Maintenance xabari</Label>
                  <Input
                    id="maintenanceMessage"
                    value={maintenanceMessage}
                    onChange={(event) => setMaintenanceMessage(event.target.value)}
                    placeholder={systemInfo.data?.maintenanceMessage ?? "Tizim yangilanmoqda"}
                  />
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-md border p-4">
                    <p className="font-medium">Backend</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {systemInfo.data?.appName ?? "Yuklanmoqda"}
                    </p>
                    <Badge variant="outline" className="mt-3">
                      {systemInfo.data?.appEnv ?? "-"} · {systemInfo.data?.version ?? "0.1.0"}
                    </Badge>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="font-medium">Jadval countlari</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Users: {tableCounts.data?.users ?? "-"} · Youth: {tableCounts.data?.youth ?? "-"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Plans: {tableCounts.data?.plans ?? "-"} · Meetings: {tableCounts.data?.meetings ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="font-medium">Admin reports</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      CSV eksportlar
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-transparent"
                        onClick={() => void handleDownloadReport("agency")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Agency CSV
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                  <Select value={reportDistrict} onValueChange={setReportDistrict}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tuman" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOSHKENT_VILOYATI_DISTRICTS.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="justify-start bg-transparent"
                    onClick={() => void handleDownloadReport("district")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    District CSV yuklab olish
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="backups" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-lg">Backups</CardTitle>
                    <CardDescription>
                      Zaxira nusxalarni ko'rish, yaratish va tiklash
                    </CardDescription>
                  </div>
                  <Button onClick={handleCreateBackup} disabled={createBackup.isPending}>
                    <Database className="mr-2 h-4 w-4" />
                    Backup yaratish
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {backups.isLoading && (
                  <p className="text-sm text-muted-foreground">Backuplar yuklanmoqda...</p>
                )}
                {backups.isError && (
                  <p className="text-sm text-destructive">Backuplarni yuklab bo'lmadi</p>
                )}
                {backups.data?.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{backup.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBytes(backup.sizeBytes)} · {formatDate(backup.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-transparent"
                        onClick={() => void handleRestoreBackup(backup.id)}
                        disabled={restoreBackup.isPending}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
                {backups.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">Backup topilmadi</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
