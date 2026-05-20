"use client";

import React from "react"

import { useState } from "react";
import { useApp } from "@/lib/app-context";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    dailyReport: true,
    weeklyReport: false,
    youthUpdates: true,
    planReminders: true,
    meetingReminders: true,
  });
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("uz");

  const handleSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    showToast("Profil muvaffaqiyatli saqlandi", "success");
  };

  const handleChangePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    showToast("Parol muvaffaqiyatli o'zgartirildi", "success");
  };

  const handleSaveNotifications = () => {
    showToast("Bildirishnoma sozlamalari saqlandi", "success");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sozlamalar</h1>
        <p className="text-muted-foreground">
          Tizim va shaxsiy sozlamalarni boshqarish
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
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
                    {currentUser?.fullName
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
                      defaultValue={currentUser?.fullName}
                      placeholder="F.I.O."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        defaultValue={currentUser?.email}
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
                        type="tel"
                        placeholder="+998 XX XXX XX XX"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50">
                      <Badge variant="secondary">
                        {currentUser?.role ? roleLabels[currentUser.role as keyof typeof roleLabels] : "-"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {currentUser?.districtId && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tuman</Label>
                      <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{currentUser.districtId}</span>
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
                  <Button type="submit">
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
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
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
                  checked={notifications.sms}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, sms: checked })
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
                  checked={notifications.push}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, push: checked })
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
                <Button onClick={handleSaveNotifications}>
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
                      type={showNewPassword ? "text" : "password"}
                      className="pl-9"
                      placeholder="Yangi parolni qayta kiriting"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit">
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
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Monitor className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">Joriy qurilma</p>
                    <p className="text-sm text-muted-foreground">
                      Toshkent, O'zbekiston - Chrome, Windows
                    </p>
                  </div>
                </div>
                <Badge className="bg-accent/10 text-accent">Faol</Badge>
              </div>
              <Button variant="outline" className="w-full bg-transparent">
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
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-5 w-5" />
                    <span>Yorug'</span>
                  </Button>
                  <Button
                    type="button"
                    variant={theme === "dark" ? "default" : "outline"}
                    className="h-auto flex-col gap-2 py-4"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-5 w-5" />
                    <span>Qorong'u</span>
                  </Button>
                  <Button
                    type="button"
                    variant={theme === "system" ? "default" : "outline"}
                    className="h-auto flex-col gap-2 py-4"
                    onClick={() => setTheme("system")}
                  >
                    <Monitor className="h-5 w-5" />
                    <span>Tizim</span>
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="language">Til</Label>
                <Select value={language} onValueChange={setLanguage}>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
