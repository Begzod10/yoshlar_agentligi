"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  downloadReport,
  useMonitoringDistricts,
  useMonitoringMasullar,
  useMonitoringOrganizations,
  useMonitoringOverview,
} from "@/lib/api/hooks/use-core-api";
import type { MonitoringPeriod } from "@/lib/api/types";
import { TOSHKENT_VILOYATI_DISTRICTS, type ToshkentDistrict } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DistrictBadge } from "@/components/ui/district-selector";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Download,
  BarChart3,
  Building2,
  UserCheck,
  MapPin,
  Award,
  TrendingUp,
  Trophy,
  Medal,
  Users,
  Target,
  Activity,
} from "lucide-react";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function MonitoringPage() {
  const {
    selectedDistrict,
    getDistrictStats,
    getVisibleOrganizations,
    getVisibleMasullar,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState("tumanlar");
  const [periodFilter, setPeriodFilter] = useState<MonitoringPeriod>("month");

  const overviewQuery = useMonitoringOverview(periodFilter);
  const monitoringDistrictsQuery = useMonitoringDistricts(periodFilter);
  const monitoringOrganizationsQuery = useMonitoringOrganizations(periodFilter);
  const monitoringMasullarQuery = useMonitoringMasullar(periodFilter);

  const fallbackDistrictStats = getDistrictStats();
  const organizations = getVisibleOrganizations();
  const masullar = getVisibleMasullar();
  const apiDistricts = monitoringDistrictsQuery.data ?? [];
  const apiOrganizations = monitoringOrganizationsQuery.data ?? [];
  const apiMasullar = monitoringMasullarQuery.data ?? [];
  const districtFilter = selectedDistrict === "all" ? null : selectedDistrict;

  // District rankings with scores
  const districtRankings = (apiDistricts.length > 0
    ? apiDistricts.map((d) => ({
        districtId: d.districtId,
        totalYouth: d.totalYouth,
        totalMasullar: d.totalMasullar,
        totalPlans: d.totalPlans,
        totalMeetings: d.totalMeetings,
        completedPlans: Math.round((d.totalPlans * d.bajarilishPct) / 100),
        completionRate: d.bajarilishPct,
        averageAiScore: d.aiBall,
        aiComment: d.aiComment ?? null,
        overallScore: Math.round(d.umumiyBall),
        rank: d.rank,
      }))
    : fallbackDistrictStats
        .map((d) => ({
          ...d,
          aiComment: null,
          overallScore: Math.round(
            d.completionRate * 0.4 +
              d.averageAiScore * 0.3 +
              (d.totalMeetings / Math.max(d.totalYouth, 1)) * 30
          ),
        }))
        .sort((a, b) => b.overallScore - a.overallScore)
  )
    .filter((d) => !districtFilter || d.districtId === districtFilter)
    .map((d, index) => ({ ...d, rank: index + 1 }));

  // Organization ratings
  const orgRatings = (apiOrganizations.length > 0
    ? apiOrganizations.map((org) => ({
        id: org.id,
        name: org.name,
        districtId: org.districtId,
        masullarCount: org.totalMasullar,
        yoshlarCount: org.totalYouth,
        score: Math.round(org.aiBall),
        aiComment: org.aiComment ?? null,
        completionRate: Math.round(org.bajarilishPct),
        rank: org.rank,
      }))
    : organizations
        .map((org) => {
          const stats = fallbackDistrictStats.find((d) => d.districtId === org.districtId);
          return {
            id: org.id,
            name: org.name,
            districtId: org.districtId,
            masullarCount: org.masullarCount,
            yoshlarCount: org.yoshlarCount,
            score: stats ? Math.round(stats.averageAiScore) : 70,
            aiComment: null,
            completionRate: stats ? Math.round(stats.completionRate) : 60,
          };
        })
        .sort((a, b) => b.score - a.score)
  )
    .filter((org) => !districtFilter || org.districtId === districtFilter)
    .map((org, index) => ({ ...org, rank: index + 1 }));

  // Masul ratings
  const masulRatings = (apiMasullar.length > 0
    ? apiMasullar.map((masul) => ({
        id: masul.id,
        fullName: masul.fullName,
        email: "",
        districtId: masul.districtId,
        assignedYouthCount: masul.totalYouth,
        completedPlansCount: Math.round((masul.totalPlans * masul.bajarilishPct) / 100),
        meetingsCount: masul.totalMeetings,
        aiScore: Math.round(masul.aiBall),
        aiComment: masul.aiComment ?? null,
        rank: masul.rank,
      }))
    : masullar.sort((a, b) => b.aiScore - a.aiScore)
  )
    .filter((masul) => !districtFilter || masul.districtId === districtFilter)
    .map((m, index) => ({
      ...m,
      rank: index + 1,
    }));

  // Bar chart data for district comparison
  const districtBarData = districtRankings.slice(0, 10).map((d) => ({
    name: d.districtId.replace(" tumani", "").slice(0, 10),
    yoshlar: d.totalYouth,
    bajarildi: d.completedPlans,
    masullar: d.totalMasullar,
  }));

  // Pie chart data for overall distribution
  const pieData = [
    { name: "Faol yoshlar", value: fallbackDistrictStats.reduce((acc, d) => acc + d.activeYouth, 0) },
    { name: "Yakunlangan", value: fallbackDistrictStats.reduce((acc, d) => acc + d.graduatedYouth, 0) },
  ];

  // Radar chart data for overall performance
  const radarSource = districtRankings.length > 0 ? districtRankings : fallbackDistrictStats;
  const radarCount = Math.max(radarSource.length, 1);
  const radarData = [
    {
      subject: "Rejalar",
      value: Math.round(radarSource.reduce((acc, d) => acc + d.completionRate, 0) / radarCount),
    },
    {
      subject: "Uchrashuvlar",
      value: Math.min(100, Math.round(radarSource.reduce((acc, d) => acc + d.totalMeetings, 0) / radarCount)),
    },
    {
      subject: "AI ball",
      value: Math.round(radarSource.reduce((acc, d) => acc + d.averageAiScore, 0) / radarCount),
    },
    {
      subject: "Qamrov",
      value: Math.round((radarSource.filter((d) => d.totalYouth > 0).length / radarCount) * 100),
    },
    {
      subject: "Mas'ullar",
      value: Math.round((radarSource.reduce((acc, d) => acc + d.totalMasullar, 0) / radarCount) * 10),
    },
  ];

  // Monthly trend data
  const trendData = [
    { month: "Yan", yoshlar: 45, rejalar: 32, score: 72 },
    { month: "Fev", yoshlar: 52, rejalar: 38, score: 74 },
    { month: "Mar", yoshlar: 61, rejalar: 45, score: 76 },
    { month: "Apr", yoshlar: 58, rejalar: 42, score: 75 },
    { month: "May", yoshlar: 72, rejalar: 56, score: 78 },
    { month: "Iyn", yoshlar: 68, rejalar: 52, score: 80 },
  ];

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
          <Trophy className="h-3 w-3 mr-1" /> 1-o'rin
        </Badge>
      );
    if (rank === 2)
      return (
        <Badge className="bg-gray-100 text-gray-800 border border-gray-300">
          <Medal className="h-3 w-3 mr-1" /> 2-o'rin
        </Badge>
      );
    if (rank === 3)
      return (
        <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
          <Medal className="h-3 w-3 mr-1" /> 3-o'rin
        </Badge>
      );
    return <span className="text-muted-foreground">{rank}-o'rin</span>;
  };

  const totalYouth = overviewQuery.data?.totalYouth ?? districtRankings.reduce((acc, d) => acc + d.totalYouth, 0);
  const totalMasullar = overviewQuery.data?.totalMasullar ?? districtRankings.reduce((acc, d) => acc + d.totalMasullar, 0);
  const totalDistricts = overviewQuery.data?.totalDistricts ?? TOSHKENT_VILOYATI_DISTRICTS.length;
  const avgCompletionRate = Math.round(
    overviewQuery.data?.avgBajarilishPct ??
      (radarSource.reduce((acc, d) => acc + d.completionRate, 0) / radarCount)
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Monitoring va Reyting
          </h1>
          <p className="text-muted-foreground">
            Toshkent viloyati 14 tumani statistikasi va reytinglari
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as MonitoringPeriod)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">So'nggi hafta</SelectItem>
              <SelectItem value="month">So'nggi oy</SelectItem>
              <SelectItem value="quarter">So'nggi chorak</SelectItem>
              <SelectItem value="year">So'nggi yil</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => {
              try {
                if (selectedDistrict === "all") {
                  void downloadReport.agency().catch((error) => {
                    showToast(error instanceof Error ? error.message : "Hisobot yuklanmadi", "error");
                  });
                } else {
                  void downloadReport.district(selectedDistrict).catch((error) => {
                    showToast(error instanceof Error ? error.message : "Hisobot yuklanmadi", "error");
                  });
                }
              } catch (error) {
                showToast(error instanceof Error ? error.message : "Hisobot yuklanmadi", "error");
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Hisobot
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jami yoshlar</p>
                <p className="text-2xl font-bold">{totalYouth}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tumanlar</p>
                <p className="text-2xl font-bold">{totalDistricts}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">O'rtacha bajarilish</p>
                <p className="text-2xl font-bold">{avgCompletionRate}%</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mas'ullar</p>
                <p className="text-2xl font-bold">{totalMasullar}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="tumanlar" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Tumanlar
          </TabsTrigger>
          <TabsTrigger value="tashkilotlar" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Tashkilotlar
          </TabsTrigger>
          <TabsTrigger value="masullar" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Mas'ullar
          </TabsTrigger>
        </TabsList>

        {/* Districts Tab */}
        <TabsContent value="tumanlar" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* District Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Tumanlar statistikasi
                </CardTitle>
                <CardDescription>Yoshlar va bajarilgan ishlar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={districtBarData}>
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
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance Radar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Umumiy ko'rsatkichlar
                </CardTitle>
                <CardDescription>Viloyat bo'yicha o'rtacha</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid className="stroke-border" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar
                        name="Ko'rsatkich"
                        dataKey="value"
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* District Ranking Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Award className="h-4 w-4" />
                Tumanlar reytingi
              </CardTitle>
              <CardDescription>Umumiy ball bo'yicha tartiblangan</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">O'rin</TableHead>
                    <TableHead>Tuman</TableHead>
                    <TableHead className="text-center">Yoshlar</TableHead>
                    <TableHead className="text-center">Mas'ullar</TableHead>
                    <TableHead className="text-center">Bajarilish</TableHead>
                    <TableHead className="text-center">AI ball</TableHead>
                    <TableHead className="text-center">Umumiy ball</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {districtRankings.map((district) => (
                    <TableRow key={district.districtId}>
                      <TableCell>{getRankBadge(district.rank)}</TableCell>
                      <TableCell>
                        <DistrictBadge districtId={district.districtId as ToshkentDistrict} />
                      </TableCell>
                      <TableCell className="text-center">{district.totalYouth}</TableCell>
                      <TableCell className="text-center">{district.totalMasullar}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={district.completionRate} className="w-16 h-2" />
                          <span className="text-sm">{Math.round(district.completionRate)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={`font-medium cursor-help underline decoration-dotted ${
                                  district.averageAiScore >= 80
                                    ? "text-accent"
                                    : district.averageAiScore >= 60
                                      ? "text-chart-3"
                                      : "text-orange-500"
                                }`}
                              >
                                {Math.round(district.averageAiScore)}%
                              </span>
                            </TooltipTrigger>
                            {district.aiComment && (
                              <TooltipContent className="max-w-xs text-sm">
                                {district.aiComment}
                              </TooltipContent>
                            )}
                          </UiTooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-lg font-bold text-primary">{district.overallScore}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="tashkilotlar" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Yoshlar holati
                </CardTitle>
                <CardDescription>Faol va yakunlangan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Oylik dinamika
                </CardTitle>
                <CardDescription>Yoshlar va AI ball o'zgarishi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
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
                      <Line type="monotone" dataKey="yoshlar" name="Yoshlar" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="score" name="AI ball" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organization Ranking Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Tashkilotlar reytingi
              </CardTitle>
              <CardDescription>AI ball bo'yicha tartiblangan</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">O'rin</TableHead>
                    <TableHead>Tashkilot</TableHead>
                    <TableHead>Tuman</TableHead>
                    <TableHead className="text-center">Mas'ullar</TableHead>
                    <TableHead className="text-center">Yoshlar</TableHead>
                    <TableHead className="text-center">Bajarilish</TableHead>
                    <TableHead className="text-center">Ball</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgRatings.slice(0, 10).map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>{getRankBadge(org.rank)}</TableCell>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <DistrictBadge districtId={org.districtId as ToshkentDistrict} size="sm" />
                      </TableCell>
                      <TableCell className="text-center">{org.masullarCount}</TableCell>
                      <TableCell className="text-center">{org.yoshlarCount}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={org.completionRate} className="w-16 h-2" />
                          <span className="text-sm">{org.completionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={`font-bold cursor-help underline decoration-dotted ${
                                  org.score >= 80
                                    ? "text-accent"
                                    : org.score >= 70
                                      ? "text-chart-3"
                                      : "text-orange-500"
                                }`}
                              >
                                {org.score}
                              </span>
                            </TooltipTrigger>
                            {org.aiComment && (
                              <TooltipContent className="max-w-xs text-sm">
                                {org.aiComment}
                              </TooltipContent>
                            )}
                          </UiTooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Masullar Tab */}
        <TabsContent value="masullar" className="space-y-6 mt-6">
          {/* Top 3 Masullar */}
          <div className="grid gap-4 md:grid-cols-3">
            {masulRatings.slice(0, 3).map((masul, index) => (
              <Card
                key={masul.id}
                className={
                  index === 0
                    ? "border-yellow-300 bg-yellow-50/50"
                    : index === 1
                      ? "border-gray-300 bg-gray-50/50"
                      : "border-amber-300 bg-amber-50/50"
                }
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-14 w-14 rounded-full flex items-center justify-center text-2xl font-bold ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : index === 1
                            ? "bg-gray-100 text-gray-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{masul.fullName}</p>
                      <DistrictBadge districtId={masul.districtId as ToshkentDistrict} size="sm" className="mt-1" />
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{masul.assignedYouthCount} yosh</span>
                        <span>{masul.completedPlansCount} reja</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <TooltipProvider>
                        <UiTooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <p className="text-3xl font-bold text-primary">{masul.aiScore}</p>
                              <p className="text-xs text-muted-foreground">AI ball</p>
                            </div>
                          </TooltipTrigger>
                          {masul.aiComment && (
                            <TooltipContent className="max-w-xs text-sm">
                              {masul.aiComment}
                            </TooltipContent>
                          )}
                        </UiTooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Masul Ranking Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Mas'ullar reytingi
              </CardTitle>
              <CardDescription>AI ball bo'yicha tartiblangan</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">O'rin</TableHead>
                    <TableHead>Mas'ul</TableHead>
                    <TableHead>Tuman</TableHead>
                    <TableHead className="text-center">Yoshlar</TableHead>
                    <TableHead className="text-center">Rejalar</TableHead>
                    <TableHead className="text-center">Uchrashuvlar</TableHead>
                    <TableHead className="text-center">AI ball</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {masulRatings.map((masul) => (
                    <TableRow key={masul.id}>
                      <TableCell>{getRankBadge(masul.rank)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{masul.fullName}</p>
                          <p className="text-sm text-muted-foreground">{masul.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DistrictBadge districtId={masul.districtId as ToshkentDistrict} size="sm" />
                      </TableCell>
                      <TableCell className="text-center">{masul.assignedYouthCount}</TableCell>
                      <TableCell className="text-center">{masul.completedPlansCount}</TableCell>
                      <TableCell className="text-center">{masul.meetingsCount}</TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center gap-2 cursor-help">
                                <span
                                  className={`font-bold ${
                                    masul.aiScore >= 80
                                      ? "text-accent"
                                      : masul.aiScore >= 70
                                        ? "text-chart-3"
                                        : "text-orange-500"
                                  }`}
                                >
                                  {masul.aiScore}%
                                </span>
                                <Progress value={masul.aiScore} className="w-16 h-2" />
                              </div>
                            </TooltipTrigger>
                            {masul.aiComment && (
                              <TooltipContent className="max-w-xs text-sm">
                                {masul.aiComment}
                              </TooltipContent>
                            )}
                          </UiTooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
