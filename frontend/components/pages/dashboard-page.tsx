"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  useAgencyStats,
  useCategoryStats,
  useRecentActivity,
} from "@/lib/api/hooks/use-core-api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DistrictBadge } from "@/components/ui/district-selector";
import { TOSHKENT_VILOYATI_DISTRICTS } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Meeting } from "@/lib/types";
import {
  Users,
  Building2,
  UserCheck,
  FileText,
  Calendar,
  TrendingUp,
  Award,
  Target,
  BarChart3,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  Activity,
  CheckCircle,
  Plus,
  MapPin,
  ArrowDown,
  ArrowUp,
  Sparkles,
  ClipboardCheck,
  Eye,
  PhoneCall,
  UserX,
  RefreshCw,
} from "lucide-react";
import { AIInsights } from "@/components/ai/ai-insights";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const categoryColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// ─── Masul Hodim: My Day Dashboard ───────────────────────────────────────────
function MasulDashboard() {
  const {
    currentUser,
    getVisibleYouth,
    getVisiblePlans,
    getVisibleMeetings,
    updateMeeting,
    setCurrentPage,
    addToast,
  } = useApp();

  const today = new Date().toISOString().split("T")[0];

  // ISO week helper
  const getISOWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  };
  const thisWeekStart = getISOWeek(today);
  const thisWeekEnd = new Date(new Date(thisWeekStart).getTime() + 6 * 86400000)
    .toISOString()
    .split("T")[0];

  const visibleYouth = getVisibleYouth();
  const visiblePlans = getVisiblePlans();
  const visibleMeetings = getVisibleMeetings();

  // Today's meetings (chronological)
  const todayMeetings = visibleMeetings
    .filter((m) => m.date === today)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  // Plans due within 7 days
  const nearDuePlans = visiblePlans
    .filter((p) => {
      if (p.status === "completed" || p.status === "cancelled") return false;
      const daysLeft =
        (new Date(p.endDate).getTime() - new Date(today).getTime()) /
        (1000 * 60 * 60 * 24);
      return daysLeft >= 0 && daysLeft <= 7;
    })
    .sort(
      (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    );

  // Youth with no meeting this week
  const unseenYouth = visibleYouth.filter((y) => {
    const hasMeetingThisWeek = visibleMeetings.some(
      (m) =>
        m.youthId === y.id &&
        m.date >= thisWeekStart &&
        m.date <= thisWeekEnd
    );
    return !hasMeetingThisWeek;
  });

  // Mark-attended modal state
  const [attendModal, setAttendModal] = useState<Meeting | null>(null);
  const [attendStatus, setAttendStatus] = useState<"attended" | "no_show" | "rescheduled">("attended");
  const [attendNotes, setAttendNotes] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const openAttendModal = (meeting: Meeting) => {
    setAttendModal(meeting);
    setAttendStatus("attended");
    setAttendNotes("");
    setAttachmentName("");
  };

  const submitAttendance = () => {
    if (!attendModal) return;
    updateMeeting(attendModal.id, {
      status: attendStatus === "rescheduled" ? "scheduled" : "completed",
      attendanceStatus: attendStatus,
      notes: attendNotes,
      ...(attachmentName ? { attachments: [attachmentName] } : {}),
    });
    addToast({
      title: "Qatnashuv belgilandi",
      description: `${attendModal.youthName} — ${attendStatus === "attended" ? "Qatnashdi" : attendStatus === "no_show" ? "Kelmadi" : "Qayta belgilandi"}`,
      type: "success",
    });
    setAttendModal(null);
  };

  const daysUntilEnd = (endDate: string) =>
    Math.ceil(
      (new Date(endDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bugungi ish kuni</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Xush kelibsiz, {currentUser?.fullName}
            {currentUser?.districtId && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <DistrictBadge districtId={currentUser.districtId} size="sm" />
              </>
            )}
          </p>
        </div>
        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            id="btn-quick-new-plan"
            size="sm"
            onClick={() => setCurrentPage("rejalar")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Yangi reja
          </Button>
          <Button
            id="btn-quick-new-meeting"
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage("uchrashuvlar")}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Uchrashuv belgilash
          </Button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCurrentPage("yoshlar")}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Biriktirilgan yoshlar</p>
                <p className="text-2xl font-bold">{visibleYouth.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCurrentPage("rejalar")}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Faol rejalar</p>
                <p className="text-2xl font-bold">{visiblePlans.filter(p => p.status === "in_progress").length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCurrentPage("uchrashuvlar")}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bugungi uchrashuvlar</p>
                <p className="text-2xl font-bold">{todayMeetings.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ko'rilmagan yoshlar</p>
                <p className="text-2xl font-bold text-orange-500">{unseenYouth.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <UserX className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's meetings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Bugungi uchrashuvlar
          </CardTitle>
          <CardDescription>{today}</CardDescription>
        </CardHeader>
        <CardContent>
          {todayMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Bugun uchun rejalashtirilgan uchrashuv yo'q
            </p>
          ) : (
            <div className="space-y-3">
              {todayMeetings.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{m.time || "--"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.youthName} · {m.location}
                      </p>
                      {m.agenda && (
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{m.agenda}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {m.status === "scheduled" ? (
                      <Button
                        id={`btn-attend-${m.id}`}
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => openAttendModal(m)}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Qatnashdi
                      </Button>
                    ) : (
                      <Badge className="bg-accent/10 text-accent border-accent/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        O'tkazildi
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column: Near-due plans + Unseen youth */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Near-due plans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Reja muddati yaqin
              </CardTitle>
              <CardDescription>7 kun ichida tugaydigan rejalar</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentPage("rejalar")}>
              Barchasi
            </Button>
          </CardHeader>
          <CardContent>
            {nearDuePlans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Yaqin muddatli rejalar yo'q ✓
              </p>
            ) : (
              <div className="space-y-4">
                {nearDuePlans.map((plan) => {
                  const days = daysUntilEnd(plan.endDate);
                  return (
                    <div key={plan.id} className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{plan.title}</p>
                          <p className="text-xs text-muted-foreground">{plan.youthName}</p>
                        </div>
                        <Badge
                          className={`shrink-0 text-xs ${
                            days <= 2
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                          }`}
                        >
                          {days === 0 ? "Bugun" : `${days} kun`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={plan.progress} className="flex-1 h-1.5" />
                        <span className="text-xs text-muted-foreground shrink-0">{plan.progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unseen youth this week */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                Bu hafta ko'rilmagan yoshlar
              </CardTitle>
              <CardDescription>Shu haftada uchrashuv bo'lmagan</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentPage("yoshlar")}>
              Barchasi
            </Button>
          </CardHeader>
          <CardContent>
            {unseenYouth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Barcha yoshlar shu hafta ko'rildi ✓
              </p>
            ) : (
              <div className="space-y-3">
                {unseenYouth.map((y) => (
                  <div key={y.id} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-muted-foreground">
                        {y.fullName.split(" ").map((n: string) => n[0]).join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{y.fullName}</p>
                      <p className="text-xs text-muted-foreground">{y.category}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs shrink-0"
                      onClick={() => setCurrentPage("uchrashuvlar")}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Uchrashuv
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mark-attended modal */}
      <Dialog open={!!attendModal} onOpenChange={(open) => !open && setAttendModal(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Qatnashuvni belgilash</DialogTitle>
          </DialogHeader>
          {attendModal && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 text-sm">
                <p className="font-medium">{attendModal.title}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {attendModal.youthName} · {attendModal.time} · {attendModal.location}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Qatnashuv holati</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "attended", label: "Qatnashdi", icon: CheckCircle, cls: "text-accent border-accent/40 bg-accent/5" },
                    { value: "no_show", label: "Kelmadi", icon: UserX, cls: "text-destructive border-destructive/40 bg-destructive/5" },
                    { value: "rescheduled", label: "Qayta", icon: RefreshCw, cls: "text-orange-500 border-orange-500/40 bg-orange-500/5" },
                  ] as const).map(({ value, label, icon: Icon, cls }) => (
                    <button
                      key={value}
                      id={`attend-status-${value}`}
                      type="button"
                      onClick={() => setAttendStatus(value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs font-medium ${
                        attendStatus === value
                          ? cls
                          : "border-border text-muted-foreground hover:border-border/80"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attend-notes">Izoh (ixtiyoriy)</Label>
                <Textarea
                  id="attend-notes"
                  placeholder="Uchrashuv natijasi haqida qisqacha..."
                  rows={3}
                  value={attendNotes}
                  onChange={(e) => setAttendNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attend-attachment">Ilova (rasm/hujjat)</Label>
                <input
                  id="attend-attachment"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-border file:text-xs file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                  onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || "")}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendModal(null)}>Bekor</Button>
            <Button id="btn-submit-attendance" onClick={submitAttendance}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DashboardPage() {
  const {
    currentUser,
    selectedDistrict,
    getVisibleYouth,
    getVisiblePlans,
    getVisibleMeetings,
    getVisibleMasullar,
    getVisibleOrganizations,
    getDistrictStats,
    canViewAllDistricts,
    setCurrentPage,
  } = useApp();

  const visibleYouth = getVisibleYouth();
  const visiblePlans = getVisiblePlans();
  const visibleMeetings = getVisibleMeetings();
  const visibleMasullar = getVisibleMasullar();
  const visibleOrganizations = getVisibleOrganizations();
  const districtStats = getDistrictStats(selectedDistrict);

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const isMasul = currentUser?.role === "masul_hodim";
  const isModerator = currentUser?.role === "moderator";
  const agencyStatsQuery = useAgencyStats(isAdmin || isDirektor || isModerator);
  const categoryStatsQuery = useCategoryStats(isAdmin || isDirektor || isModerator);
  const recentActivityQuery = useRecentActivity(6, isAdmin || isDirektor || isModerator);

  // ── Early return for caseworker role ──────────────────────────────────────
  if (isMasul) {
    return <MasulDashboard />;
  }

  // Calculate aggregate stats
  const fallbackTotalStats = districtStats.reduce(
    (acc, d) => ({
      totalYouth: acc.totalYouth + d.totalYouth,
      activeYouth: acc.activeYouth + d.activeYouth,
      graduatedYouth: acc.graduatedYouth + d.graduatedYouth,
      totalOrganizations: acc.totalOrganizations + d.totalOrganizations,
      totalMasullar: acc.totalMasullar + d.totalMasullar,
      totalPlans: acc.totalPlans + d.totalPlans,
      completedPlans: acc.completedPlans + d.completedPlans,
      totalMeetings: acc.totalMeetings + d.totalMeetings,
    }),
    {
      totalYouth: 0,
      activeYouth: 0,
      graduatedYouth: 0,
      totalOrganizations: 0,
      totalMasullar: 0,
      totalPlans: 0,
      completedPlans: 0,
      totalMeetings: 0,
    }
  );
  const totalStats = agencyStatsQuery.data
    ? {
        totalYouth: agencyStatsQuery.data.totalYouth,
        activeYouth: agencyStatsQuery.data.activeYouth,
        graduatedYouth: agencyStatsQuery.data.graduatedYouth,
        totalOrganizations: agencyStatsQuery.data.totalOrganizations,
        totalMasullar: agencyStatsQuery.data.totalMasullar,
        totalPlans: agencyStatsQuery.data.totalPlans,
        completedPlans: agencyStatsQuery.data.completedPlans,
        totalMeetings: agencyStatsQuery.data.totalMeetings,
      }
    : fallbackTotalStats;

  const overallCompletionRate =
    totalStats.totalPlans > 0
      ? Math.round((totalStats.completedPlans / totalStats.totalPlans) * 100)
      : 0;

  const averageAiScore =
    visibleYouth.length > 0
      ? Math.round(visibleYouth.reduce((acc, y) => acc + y.aiScore, 0) / visibleYouth.length)
      : 0;

  const scheduledMeetings = visibleMeetings.filter((m) => m.status === "scheduled").length;
  const completedMeetings = visibleMeetings.filter((m) => m.status === "completed").length;
  const inProgressPlans = visiblePlans.filter((p) => p.status === "in_progress").length;
  const completedPlans = visiblePlans.filter((p) => p.status === "completed").length;

  // Category distribution
  const categoryMap = new Map<string, number>();
  visibleYouth.forEach((y) => {
    categoryMap.set(y.category, (categoryMap.get(y.category) || 0) + 1);
  });
  const categoryData =
    categoryStatsQuery.data?.map((item, index) => ({
      name: item.category,
      value: item.totalYouth,
      color: categoryColors[index % categoryColors.length],
    })) ??
    Array.from(categoryMap.entries()).map(([name, value], index) => ({
      name,
      value,
      color: categoryColors[index % categoryColors.length],
    }));

  // District comparison data for bar chart
  const districtChartData = districtStats
    .map((d) => ({
      name: d.districtId.replace(" tumani", "").slice(0, 8),
      yoshlar: d.totalYouth,
      bajarildi: d.completedPlans,
      masullar: d.totalMasullar,
      score: Math.round(d.averageAiScore),
    }))
    .sort((a, b) => b.yoshlar - a.yoshlar)
    .slice(0, 8);

  // District ranking data
  const districtRankingData = districtStats
    .map((d) => ({
      ...d,
      score: Math.round(d.completionRate + d.averageAiScore / 2),
    }))
    .sort((a, b) => b.score - a.score);

  // Status data for pie chart
  const statusData = [
    { name: "Faol", value: totalStats.activeYouth, color: "var(--chart-2)" },
    { name: "Yakunlangan", value: totalStats.graduatedYouth, color: "var(--chart-1)" },
  ];

  // Monthly trend data
  const monthlyData = [
    { month: "Yan", yoshlar: 45, rejalar: 32, uchrashuvlar: 78 },
    { month: "Fev", yoshlar: 52, rejalar: 38, uchrashuvlar: 92 },
    { month: "Mar", yoshlar: 61, rejalar: 45, uchrashuvlar: 105 },
    { month: "Apr", yoshlar: 58, rejalar: 42, uchrashuvlar: 98 },
    { month: "May", yoshlar: 72, rejalar: 56, uchrashuvlar: 124 },
    { month: "Iyn", yoshlar: 68, rejalar: 52, uchrashuvlar: 118 },
  ];
  const recentActivities = recentActivityQuery.data ?? [];

  const getDashboardTitle = () => {
    if (currentUser?.role === "tashkilot_direktori" && currentUser.districtId) {
      return `${currentUser.districtId} - Boshqaruv paneli`;
    }
    switch (currentUser?.role) {
      case "admin":
        return "Toshkent viloyati - Administrator paneli";
      case "direktor":
        return "Toshkent viloyati - Yoshlar agentligi";
      case "masul_hodim":
        return "Mas'ul hodim ish paneli";
      case "moderator":
        return "Toshkent viloyati - Monitoring va tahlil";
      default:
        return "Boshqaruv paneli";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{getDashboardTitle()}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Xush kelibsiz, {currentUser?.fullName}
            {currentUser?.districtId && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <DistrictBadge districtId={currentUser.districtId} size="sm" />
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedDistrict !== "all" && canViewAllDistricts() && (
            <Badge variant="secondary" className="gap-1">
              <MapPin className="h-3 w-3" />
              {selectedDistrict}
            </Badge>
          )}
        </div>
      </div>

      {/* Alert for Masul - Meeting requirement */}
      {isMasul && scheduledMeetings < 2 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">Ogohlantirish</p>
              <p className="text-sm text-muted-foreground">
                Bu oy uchun kamida 2 ta uchrashuv rejalashtirilishi kerak. Hozirda: {scheduledMeetings}
              </p>
            </div>
            <Button size="sm" onClick={() => setCurrentPage("uchrashuvlar")}>
              <Plus className="h-4 w-4 mr-1" />
              Uchrashuv qo'shish
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentPage("yoshlar")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isMasul ? "Biriktirilgan yoshlar" : "Jami yoshlar"}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {isMasul ? visibleYouth.length : totalStats.totalYouth}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-accent" />
                  <span className="text-xs text-accent">+12%</span>
                  <span className="text-xs text-muted-foreground">o'tgan oyga</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentPage("rejalar")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Individual rejalar</p>
                <p className="text-2xl font-bold text-foreground">{visiblePlans.length}</p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle className="h-3 w-3 text-accent" />
                  <span className="text-xs text-accent">{completedPlans} bajarilgan</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        {(isAdmin || isDirektor || isTashkilotDirektor) && (
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setCurrentPage(isTashkilotDirektor ? "masullar" : "tashkilotlar")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isTashkilotDirektor ? "Mas'ullar" : "Tashkilotlar"}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {isTashkilotDirektor ? visibleMasullar.length : totalStats.totalOrganizations}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-3 w-3 text-accent" />
                    <span className="text-xs text-muted-foreground">
                      {isTashkilotDirektor
                        ? `${visibleMasullar.reduce((acc, m) => acc + m.assignedYouthCount, 0)} yosh biriktirilgan`
                        : `${totalStats.totalMasullar} mas'ul`}
                    </span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  {isTashkilotDirektor ? (
                    <UserCheck className="h-6 w-6 text-chart-3" />
                  ) : (
                    <Building2 className="h-6 w-6 text-chart-3" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentPage("uchrashuvlar")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Uchrashuvlar</p>
                <p className="text-2xl font-bold text-foreground">{visibleMeetings.length}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-orange-500" />
                  <span className="text-xs text-orange-500">{scheduledMeetings} rejalashtirilgan</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {(isMasul || isModerator) && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">O'rtacha AI ball</p>
                  <p className="text-2xl font-bold text-foreground">{averageAiScore}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-3 w-3 text-accent" />
                    <span className="text-xs text-accent">+5</span>
                    <span className="text-xs text-muted-foreground">o'tgan oyga</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-chart-5/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-chart-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* District Comparison Chart - Admin/Director/Moderator */}
      {(isAdmin || isDirektor || isModerator) && selectedDistrict === "all" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Tumanlar bo'yicha taqqoslash
            </CardTitle>
            <CardDescription>Toshkent viloyati 14 tumani statistikasi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="yoshlar" name="Yoshlar" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bajarildi" name="Bajarilgan" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="masullar" name="Mas'ullar" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* District Ranking - Admin/Director/Moderator */}
        {(isAdmin || isDirektor || isModerator) && selectedDistrict === "all" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Award className="h-4 w-4" />
                Tumanlar reytingi
              </CardTitle>
              <CardDescription>Bajarilish va AI ball bo'yicha</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {districtRankingData.slice(0, 10).map((district, index) => (
                  <div key={district.districtId} className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : index === 1
                            ? "bg-gray-100 text-gray-700"
                            : index === 2
                              ? "bg-amber-100 text-amber-700"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {district.districtId.replace(" tumani", "")}
                        </span>
                        <span className="text-sm font-bold text-primary">{district.score}%</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>{district.totalYouth} yosh</span>
                        <span>{district.totalMasullar} mas'ul</span>
                        <span>{Math.round(district.completionRate)}% bajarildi</span>
                      </div>
                      <Progress value={district.score} className="h-1 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Distribution */}
        {categoryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Kategoriyalar bo'yicha taqsimot
              </CardTitle>
              <CardDescription>Yoshlar muammolari turlari</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row items-center gap-4">
                <div className="w-full lg:w-1/2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {categoryData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground truncate max-w-32">{item.name}</span>
                      </div>
                      <span className="font-medium text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Youth Status Distribution */}
        {statusData.some((s) => s.value > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Yoshlar holati
              </CardTitle>
              <CardDescription>Faol va yakunlangan yoshlar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Trend - Admin/Director/OrgDirector */}
        {(isAdmin || isDirektor || isTashkilotDirektor) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Oylik dinamika
              </CardTitle>
              <CardDescription>Yoshlar, rejalar va uchrashuvlar soni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="yoshlar"
                      name="Yoshlar"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rejalar"
                      name="Rejalar"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="uchrashuvlar"
                      name="Uchrashuvlar"
                      stroke="var(--chart-3)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Section - Top Performers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Masullar per District */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Award className="h-4 w-4" />
                {isMasul ? "Biriktirilgan yoshlar" : "Eng yaxshi mas'ullar"}
              </CardTitle>
              <CardDescription>
                {isMasul ? "Sizga tayinlangan yoshlar" : "AI ball bo'yicha reyting"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentPage(isMasul ? "yoshlar" : "masullar")}>
              Barchasi
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isMasul
                ? visibleYouth.slice(0, 5).map((youth) => (
                    <div key={youth.id} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {youth.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{youth.fullName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{youth.category}</span>
                          <DistrictBadge districtId={youth.districtId} size="sm" />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-primary">{youth.aiScore}%</p>
                        <p className="text-xs text-muted-foreground">AI ball</p>
                      </div>
                    </div>
                  ))
                : visibleMasullar
                    .sort((a, b) => b.aiScore - a.aiScore)
                    .slice(0, 5)
                    .map((masul, index) => (
                      <div key={masul.id} className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : index === 1
                                ? "bg-gray-100 text-gray-700"
                                : index === 2
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{masul.fullName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{masul.assignedYouthCount} yosh</span>
                            <DistrictBadge districtId={masul.districtId} size="sm" />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-primary">{masul.aiScore}%</p>
                          <p className="text-xs text-muted-foreground">AI ball</p>
                        </div>
                      </div>
                    ))}
            </div>
          </CardContent>
        </Card>

        {/* Organization Performance */}
        {(isAdmin || isDirektor || isModerator) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Tashkilotlar samaradorligi
                </CardTitle>
                <CardDescription>Tumanlar bo'yicha</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage("tashkilotlar")}>
                Barchasi
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {visibleOrganizations.slice(0, 6).map((org) => (
                  <div key={org.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-chart-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{org.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <DistrictBadge districtId={org.districtId} size="sm" />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm">{org.yoshlarCount}</p>
                      <p className="text-xs text-muted-foreground">yoshlar</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Insights */}
        {(isAdmin || isDirektor || isModerator) && (
          <AIInsights 
            districtStats={districtStats} 
            youthData={visibleYouth}
            className="lg:col-span-2"
          />
        )}

        {/* Recent Activities */}
        <Card className={!(isAdmin || isDirektor || isModerator) ? "lg:col-span-2" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                So'nggi faoliyat
              </CardTitle>
              <CardDescription>Oxirgi harakatlar</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length > 0
                ? recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center mt-0.5">
                        <Activity className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{activity.action}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.entityType} · {activity.role} ·{" "}
                          {new Intl.DateTimeFormat("uz-UZ", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(activity.createdAt))}
                        </p>
                      </div>
                    </div>
                  ))
                : visibleMeetings
                .filter((m) => m.status === "completed")
                .slice(0, 4)
                .map((meeting) => {
                  const youthData = visibleYouth.find((y) => y.id === meeting.youthId);
                  return (
                    <div key={meeting.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center mt-0.5">
                        <CheckCircle className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {meeting.youthName} - {meeting.date}
                        </p>
                        {youthData && <DistrictBadge districtId={youthData.districtId} size="sm" className="mt-1" />}
                      </div>
                    </div>
                  );
                })}
              {recentActivities.length === 0 && visibleMeetings.filter((m) => m.status === "completed").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Hozircha yakunlangan uchrashuvlar yo'q
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
