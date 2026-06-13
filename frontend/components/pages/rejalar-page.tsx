"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/app-context";
import { usePlans } from "@/lib/api/hooks/use-core-api";
import type { IndividualPlan, PlanMilestone } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  Download,
  FileText,
  CheckCircle,
  Clock,
  Calendar,
  PlayCircle,
  XCircle,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";

interface Milestone {
  week: number;
  target: string;
}

interface AIPlanRecommendation {
  title: string;
  description: string;
  activities: { name: string; frequency: string; responsible: string; duration: string }[];
  milestones: Milestone[];
  expectedOutcomes: string[];
}

export function RejalarPage() {
  const {
    currentUser,
    plans,
    youth,
    masullar,
    addPlan,
    updatePlan,
    deletePlan,
    getVisibleYouth,
    selectedDistrict,
    addToast,
  } = useApp();

  // Fire GET /api/plans on mount
  usePlans({ page: 1, limit: 100 });

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isMasul = currentUser?.role === "masul_hodim";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const canAdd = isAdmin || isDirektor || isTashkilotDirektor || isMasul;
  const canEdit = isAdmin || isDirektor || isTashkilotDirektor || isMasul;
  const canDelete = isAdmin || isDirektor;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<IndividualPlan | null>(null);
  const [progressMilestones, setProgressMilestones] = useState<PlanMilestone[]>([]);
  const [progressComment, setProgressComment] = useState("");

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AIPlanRecommendation | null>(null);
  const [selectedYouthForAI, setSelectedYouthForAI] = useState<string>("");

  // Milestones for new plan form
  const [milestones, setMilestones] = useState<Milestone[]>([{ week: 1, target: "" }]);

  // Get visible youth filtered by role
  const ownYouth = getVisibleYouth();

  const filteredYouth = isMasul
      ? ownYouth
      : youth.filter((y) => {
        if (isTashkilotDirektor && currentUser?.districtId) {
          return y.districtId === currentUser.districtId;
        }
        if (selectedDistrict && selectedDistrict !== "all") return y.districtId === selectedDistrict;
        return true;
      });

  const youthIds = filteredYouth.map((y) => y.id);

  let filteredPlans = plans.filter((p) => {
    if (isMasul) {
      if (p.masulId !== currentUser?.id) return false;
    } else if (isTashkilotDirektor && currentUser?.districtId) {
      if (!youthIds.includes(p.youthId)) return false;
    } else if (selectedDistrict && selectedDistrict !== "all") {
      if (!youthIds.includes(p.youthId)) return false;
    }

    if (statusFilter !== "all" && p.status !== statusFilter) return false;

    const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.youthName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const totalPlans = filteredPlans.length;
  const completedPlans = filteredPlans.filter((p) => p.status === "completed").length;
  const inProgressPlans = filteredPlans.filter((p) => p.status === "in_progress").length;
  const completionRate = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;

  const getStatusBadge = (status: IndividualPlan["status"]) => {
    switch (status) {
      case "completed":
        return (
            <Badge className="bg-accent/10 text-accent border-accent/20">
              <CheckCircle className="mr-1 h-3 w-3" />
              Bajarilgan
            </Badge>
        );
      case "in_progress":
        return (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <PlayCircle className="mr-1 h-3 w-3" />
              Jarayonda
            </Badge>
        );
      case "planned":
        return (
            <Badge className="bg-muted text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              Rejalashtirilgan
            </Badge>
        );
      case "cancelled":
        return (
            <Badge className="bg-destructive/10 text-destructive border-destructive/20">
              <XCircle className="mr-1 h-3 w-3" />
              Bekor qilingan
            </Badge>
        );
    }
  };

  // ─── AI Recommendation ──────────────────────────────────────────────────────
  const fetchAIRecommendation = async (youthId: string) => {
    const youthObj = filteredYouth.find((y) => y.id === youthId);
    if (!youthObj) return;

    setAiLoading(true);
    setAiRecommendation(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "plan-recommendation",
          youthId: youthObj.id,
          userId: currentUser?.id,
          data: {
            youth: youthObj,
            existingPlans: plans.filter((p) => p.youthId === youthObj.id),
          },
        }),
      });
      if (!res.ok) throw new Error("AI xizmati xatosi");
      const json = await res.json();
      setAiRecommendation(json.plan);
    } catch (err) {
      addToast({ title: "AI xatosi", description: "Tavsiya olishda xato yuz berdi", type: "error" });
    } finally {
      setAiLoading(false);
    }
  };

  const acceptAIRecommendation = () => {
    if (!aiRecommendation) return;
    setMilestones(aiRecommendation.milestones);
    setIsAddDialogOpen(true);
    // Pre-fill title / description via refs would require uncontrolled forms; we store in state instead
    addToast({ title: "AI tavsiyasi qabul qilindi", description: "Formani tekshirib, saqlang", type: "info" });
  };

  // ─── Add Plan ────────────────────────────────────────────────────────────────
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formYouthId, setFormYouthId] = useState("");
  const [formMasulId, setFormMasulId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  const openAddDialog = () => {
    if (aiRecommendation) {
      setFormTitle(aiRecommendation.title);
      setFormDescription(aiRecommendation.description);
      setMilestones(aiRecommendation.milestones);
    } else {
      setFormTitle("");
      setFormDescription("");
      setMilestones([{ week: 1, target: "" }]);
    }
    setFormYouthId(selectedYouthForAI || "");
    setFormMasulId("");
    setFormStartDate("");
    setFormEndDate("");
    setIsAddDialogOpen(true);
  };

  const handleAddPlan = () => {
    if (!formTitle || !formYouthId || !formStartDate || !formEndDate) {
      addToast({ title: "Xatolik", description: "Majburiy maydonlarni to'ldiring", type: "error" });
      return;
    }

    const selectedYouthObj = filteredYouth.find((y) => y.id === formYouthId);
    const masulId = isMasul ? currentUser?.id || "" : formMasulId;
    const selectedMasulObj = masullar.find((m) => m.id === masulId);

    addPlan({
      title: formTitle,
      description: formDescription,
      youthId: formYouthId,
      youthName: selectedYouthObj?.fullName || "",

      masulId: masulId, // 🔥 IMPORTANT
      masulName: selectedMasulObj?.fullName || currentUser?.fullName || "",

      startDate: formStartDate,
      endDate: formEndDate,
      status: "in_progress",
      progress: 0,
    });
    setIsAddDialogOpen(false);
    setAiRecommendation(null);
    setSelectedYouthForAI("");
  };

  // ─── Update Progress ─────────────────────────────────────────────────────────
  const openProgressDialog = (plan: IndividualPlan) => {
    setSelectedPlan(plan);
    setProgressMilestones(
      plan.milestones.length > 0
        ? plan.milestones.map((m) => ({ ...m }))
        : [{ title: plan.title, done: plan.progress === 100, dueDate: null }]
    );
    setProgressComment("");
    setIsProgressDialogOpen(true);
  };

  const calcProgress = (ms: PlanMilestone[]) =>
    ms.length === 0 ? 0 : Math.round((ms.filter((m) => m.done).length / ms.length) * 100);

  const toggleMilestone = (index: number) => {
    setProgressMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, done: !m.done } : m))
    );
  };

  const handleUpdateProgress = () => {
    if (!selectedPlan) return;
    const progress = calcProgress(progressMilestones);
    updatePlan(selectedPlan.id, {
      milestones: progressMilestones,
      progress,
      status: progress === 100 ? "completed" : "in_progress",
    });
    setIsProgressDialogOpen(false);
  };

  const handleDeletePlan = (plan: IndividualPlan) => {
    if (confirm(`"${plan.title}" rejasini o'chirishni tasdiqlaysizmi?`)) {
      deletePlan(plan.id);
    }
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Individual rejalar</h1>
            <p className="text-muted-foreground">
              Yoshlar uchun individual ishlash rejalarini boshqarish
            </p>
          </div>
          {canAdd && (
              <Button id="btn-add-plan" onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Reja qo'shish
              </Button>
          )}
        </div>

        {/* AI Recommendation panel (masul_hodim) */}
        {isMasul && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  AI dan reja taklifini olish
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select
                      value={selectedYouthForAI}
                      onValueChange={setSelectedYouthForAI}
                  >
                    <SelectTrigger className="flex-1" id="ai-youth-select">
                      <SelectValue placeholder="Yosh tanlang..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ownYouth.map((y) => (
                          <SelectItem key={y.id} value={y.id}>
                            {y.fullName} — {y.category}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                      id="btn-ai-recommend"
                      variant="default"
                      disabled={!selectedYouthForAI || aiLoading}
                      onClick={() => fetchAIRecommendation(selectedYouthForAI)}
                      className="gap-2 shrink-0"
                  >
                    {aiLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="h-4 w-4" />
                    )}
                    {aiLoading ? "Tahlil qilinmoqda..." : "AI tavsiyasi"}
                  </Button>
                </div>

                {/* AI result card */}
                {aiRecommendation && (
                    <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-background space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{aiRecommendation.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{aiRecommendation.description}</p>
                        </div>
                        <button
                            onClick={() => setAiRecommendation(null)}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {aiRecommendation.milestones.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Bosqichlar:</p>
                            <div className="space-y-1">
                              {aiRecommendation.milestones.map((m) => (
                                  <div key={m.week} className="flex gap-2 text-xs">
                                    <span className="text-primary font-medium shrink-0">{m.week}-hafta:</span>
                                    <span className="text-muted-foreground">{m.target}</span>
                                  </div>
                              ))}
                            </div>
                          </div>
                      )}

                      {aiRecommendation.expectedOutcomes.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Kutilayotgan natijalar:</p>
                            <ul className="space-y-0.5">
                              {aiRecommendation.expectedOutcomes.map((o, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex gap-1">
                                    <CheckCircle className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                                    {o}
                                  </li>
                              ))}
                            </ul>
                          </div>
                      )}

                      <Button
                          id="btn-accept-ai-plan"
                          size="sm"
                          className="w-full gap-2"
                          onClick={acceptAIRecommendation}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Qabul qilish va formani to'ldirish
                      </Button>
                    </div>
                )}
              </CardContent>
            </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Jami rejalar</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPlans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bajarilgan</CardTitle>
              <CheckCircle className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{completedPlans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Jarayonda</CardTitle>
              <PlayCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{inProgressPlans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bajarish darajasi</CardTitle>
              <Calendar className="h-4 w-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{completionRate}%</div>
                <Progress value={completionRate} className="flex-1 h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Reja nomi yoki yosh nomi bo'yicha qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Holat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha holatlar</SelectItem>
                  <SelectItem value="planned">Rejalashtirilgan</SelectItem>
                  <SelectItem value="in_progress">Jarayonda</SelectItem>
                  <SelectItem value="completed">Bajarilgan</SelectItem>
                  <SelectItem value="cancelled">Bekor qilingan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Plans Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reja nomi</TableHead>
                  <TableHead>Yosh</TableHead>
                  {!isMasul && <TableHead>Mas'ul</TableHead>}
                  <TableHead>Muddat</TableHead>
                  <TableHead className="text-center">Progress</TableHead>
                  <TableHead className="text-center">Holat</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isMasul ? 6 : 7} className="text-center py-8 text-muted-foreground">
                        Rejalar topilmadi
                      </TableCell>
                    </TableRow>
                ) : (
                    filteredPlans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{plan.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">{plan.description}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{plan.youthName}</span>
                          </TableCell>
                          {!isMasul && (
                              <TableCell>
                                <span className="text-sm">{plan.masulName}</span>
                              </TableCell>
                          )}
                          <TableCell>
                            <div className="text-sm">
                              <p>{plan.startDate}</p>
                              <p className="text-muted-foreground">{plan.endDate}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Progress value={plan.progress} className="w-16 h-2" />
                              <span className="text-sm font-medium">{plan.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(plan.status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Amallar</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedPlan(plan);
                                      setIsViewDialogOpen(true);
                                    }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ko'rish
                                </DropdownMenuItem>
                                {canEdit && plan.status !== "completed" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openProgressDialog(plan)}>
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Progressni yangilash
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                          onClick={() => updatePlan(plan.id, { status: "completed", progress: 100 })}
                                      >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Bajarildi
                                      </DropdownMenuItem>
                                    </>
                                )}
                                {canDelete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => handleDeletePlan(plan)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        O'chirish
                                      </DropdownMenuItem>
                                    </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Plan Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yangi reja qo'shish</DialogTitle>
              <DialogDescription>Individual ishlash rejasini yarating</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="plan-title">Reja nomi *</Label>
                <Input
                    id="plan-title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Reja nomini kiriting"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-description">Tavsif</Label>
                <Textarea
                    id="plan-description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Reja haqida qisqacha ma'lumot"
                    rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-youth">Yosh *</Label>
                <Select value={formYouthId} onValueChange={setFormYouthId}>
                  <SelectTrigger id="plan-youth">
                    <SelectValue placeholder="Yoshni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredYouth.map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.fullName}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isMasul && (
                  <div className="grid gap-2">
                    <Label htmlFor="plan-masul">Mas'ul hodim *</Label>
                    <Select value={formMasulId} onValueChange={setFormMasulId}>
                      <SelectTrigger id="plan-masul">
                        <SelectValue placeholder="Mas'ulni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {masullar.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.fullName}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="plan-start">Boshlanish sanasi *</Label>
                  <Input
                      id="plan-start"
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan-end">Tugash sanasi *</Label>
                  <Input
                      id="plan-end"
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Milestones */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Bosqichlar (milestones)</Label>
                  <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setMilestones([...milestones, { week: milestones.length + 1, target: "" }])}
                  >
                    + Bosqich qo'shish
                  </Button>
                </div>
                <div className="space-y-2">
                  {milestones.map((ms, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">{ms.week}-hafta:</span>
                        <Input
                            value={ms.target}
                            onChange={(e) => {
                              const updated = [...milestones];
                              updated[idx] = { ...updated[idx], target: e.target.value };
                              setMilestones(updated);
                            }}
                            placeholder={`${ms.week}-hafta maqsadi`}
                            className="text-sm h-8"
                        />
                        {milestones.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => setMilestones(milestones.filter((_, i) => i !== idx))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                      </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Bekor qilish
              </Button>
              <Button id="btn-save-plan" onClick={handleAddPlan}>
                Saqlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Plan Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Reja ma'lumotlari</DialogTitle>
            </DialogHeader>
            {selectedPlan && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedPlan.title}</h3>
                      {getStatusBadge(selectedPlan.status)}
                    </div>
                  </div>
                  <p className="text-muted-foreground">{selectedPlan.description}</p>
                  <div className="grid gap-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Yosh</span>
                      <span className="font-medium">{selectedPlan.youthName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Mas'ul hodim</span>
                      <span className="font-medium">{selectedPlan.masulName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Boshlanish sanasi</span>
                      <span className="font-medium">{selectedPlan.startDate}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Tugash sanasi</span>
                      <span className="font-medium">{selectedPlan.endDate}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Progress</span>
                      <div className="flex items-center gap-2">
                        <Progress value={selectedPlan.progress} className="w-24 h-2" />
                        <span className="font-medium">{selectedPlan.progress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Progress Update Dialog */}
        <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Progressni yangilash</DialogTitle>
              <DialogDescription>{selectedPlan?.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="flex items-center justify-between">
                <Label>Bajarilish darajasi</Label>
                <span className="text-2xl font-bold text-primary">
                  {calcProgress(progressMilestones)}%
                </span>
              </div>
              <Progress value={calcProgress(progressMilestones)} className="h-2" />

              <div className="space-y-2">
                <Label>Bosqichlar</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {progressMilestones.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleMilestone(i)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors hover:bg-muted/50"
                    >
                      <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${m.done ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                        {m.done && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className={`text-sm ${m.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {m.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {calcProgress(progressMilestones) === 100 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 text-accent text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Reja bajarilgan deb belgilanadi
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="progress-comment">Izoh (ixtiyoriy)</Label>
                <Textarea
                    id="progress-comment"
                    value={progressComment}
                    onChange={(e) => setProgressComment(e.target.value)}
                    placeholder="Bu yangilanish haqida qisqacha..."
                    rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProgressDialogOpen(false)}>
                Bekor
              </Button>
              <Button id="btn-save-progress" onClick={handleUpdateProgress}>
                Saqlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
