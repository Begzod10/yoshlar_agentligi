"use client";

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-context";
import { adminApi } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/storage";
import { config } from "@/lib/config";
import type { PlanRead, YouthRead, MasulRead, MeetingAttachment } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
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
  FileText,
  CheckCircle,
  Clock,
  Calendar,
  PlayCircle,
  XCircle,
  Sparkles,
  Loader2,
  X,
  Maximize2,
  Paperclip,
} from "lucide-react";

function isImage(att: MeetingAttachment) {
  return att.content_type?.startsWith("image/") ?? false;
}

function attachmentUrl(att: MeetingAttachment) {
  const p = att.path;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${config.apiUrl}/${p.replace(/^\//, "")}`;
}

function PlanFilePreview({ att, onFullscreen }: { att: MeetingAttachment; onFullscreen: (url: string) => void }) {
  const url = attachmentUrl(att);
  if (isImage(att)) {
    return (
      <div className="relative group rounded-lg overflow-hidden border bg-muted/30">
        <img src={url} alt={att.filename} className="w-full max-h-48 object-contain" />
        <button
          onClick={() => onFullscreen(url)}
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          title="To'liq ekranda ko'rish"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors text-sm text-primary"
    >
      <Paperclip className="h-4 w-4 shrink-0" />
      <span className="truncate">{att.filename}</span>
      <span className="text-xs text-muted-foreground shrink-0">({Math.round(att.size / 1024)} KB)</span>
    </a>
  );
}

interface Milestone {
  week: number;
  target: string;
  dueDate?: string;
  notes?: string;
}

interface AIPlanRecommendation {
  title: string;
  description: string;
  activities: { name: string; frequency: string; responsible: string; duration: string }[];
  milestones: Milestone[];
  expectedOutcomes: string[];
}

export function AdminRejalarPage() {
  const { currentUser, addToast } = useApp();
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isMasul = currentUser?.role === "masul_hodim";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const canAdd = isAdmin || isDirektor || isTashkilotDirektor || isMasul;
  const canDelete = isAdmin || isDirektor;

  // ── Dialog state (declared before queries that depend on them) ─────────
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: () =>
      adminApi.get<{ data: PlanRead[]; total: number }>("/api/plans", {
        query: { page: 1, limit: 50 },
      }),
  });

  const { data: youthData } = useQuery({
    queryKey: ["admin-all-youth-plans"],
    queryFn: () =>
      adminApi.get<{ data: YouthRead[]; total: number }>("/api/youth", {
        query: { page: 1, limit: 100 },
      }),
    enabled: isMasul || isAddDialogOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: masullarData } = useQuery({
    queryKey: ["admin-all-masullar-plans"],
    queryFn: () =>
      adminApi.get<{ data: MasulRead[]; total: number }>("/api/masullar", {
        query: { page: 1, limit: 200 },
      }),
    staleTime: 5 * 60 * 1000,
  });

  const allPlans = plansData?.data ?? [];

  const youthMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const y of youthData?.data ?? []) m[y.id] = y.fullName;
    return m;
  }, [youthData]);

  const masulMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const ms of masullarData?.data ?? []) m[ms.id] = ms.fullName;
    return m;
  }, [masullarData]);

  const getYouthName = (id: string) => youthMap[id] ?? id.slice(0, 8) + "...";
  const getMasulName = (plan: PlanRead) => plan.masulName ?? (plan.masulId ? (masulMap[plan.masulId] ?? "—") : "—");

  // ── Filter state ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanRead | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PlanRead | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressComment, setProgressComment] = useState("");
  const [progressFile, setProgressFile] = useState<File | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [completeNote, setCompleteNote] = useState("");
  const [completeFile, setCompleteFile] = useState<File | null>(null);
  const [completePlan, setCompletePlan] = useState<PlanRead | null>(null);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AIPlanRecommendation | null>(null);
  const [selectedYouthForAI, setSelectedYouthForAI] = useState<string>("");

  // Milestones for new plan form
  const [milestones, setMilestones] = useState<Milestone[]>([{ week: 1, target: "" }]);

  // Add plan form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formYouthId, setFormYouthId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  // ── Filtered plans ────────────────────────────────────────────────────
  const filteredPlans = allPlans.filter((p) => {
    if (isMasul && p.masulId !== currentUser?.id) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      getYouthName(p.youthId).toLowerCase().includes(q)
    );
  });

  const totalPlans = filteredPlans.length;
  const completedPlans = filteredPlans.filter((p) => p.status === "completed").length;
  const inProgressPlans = filteredPlans.filter((p) => p.status === "in_progress").length;
  const completionRate = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;

  // Youth list for the add form
  const formYouthList = youthData?.data ?? [];

  const getStatusBadge = (status: PlanRead["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-accent/10 text-accent border-accent/20">
            <CheckCircle className="mr-1 h-3 w-3" />Bajarilgan
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <PlayCircle className="mr-1 h-3 w-3" />Jarayonda
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-muted text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />Qoralama
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="mr-1 h-3 w-3" />Bekor qilingan
          </Badge>
        );
    }
  };

  // ── AI Recommendation ─────────────────────────────────────────────────
  const fetchAIRecommendation = async (youthId: string) => {
    setAiLoading(true);
    setAiRecommendation(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "plan-recommendation",
          youthId,
          userId: currentUser?.id,
          data: { youthId, existingPlans: allPlans.filter((p) => p.youthId === youthId) },
        }),
      });
      if (!res.ok) throw new Error("AI xizmati xatosi");
      const json = await res.json();
      setAiRecommendation(json.plan);
    } catch {
      addToast({ title: "AI xatosi", description: "Tavsiya olishda xato yuz berdi", type: "error" });
    } finally {
      setAiLoading(false);
    }
  };

  const acceptAIRecommendation = () => {
    if (!aiRecommendation) return;
    setMilestones(aiRecommendation.milestones);
    setIsAddDialogOpen(true);
    addToast({ title: "AI tavsiyasi qabul qilindi", description: "Formani tekshirib, saqlang", type: "info" });
  };

  // ── Add Plan ──────────────────────────────────────────────────────────
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
    setFormStartDate("");
    setFormEndDate("");
    setIsAddDialogOpen(true);
  };

  const handleAddPlan = async () => {
    if (!formTitle || !formYouthId || !formStartDate || !formEndDate) {
      addToast({ title: "Xatolik", description: "Majburiy maydonlarni to'ldiring", type: "error" });
      return;
    }
    const planMilestones = milestones
      .filter((item) => item.target.trim())
      .map((item) => ({
        title: item.target.trim(),
        done: false,
        dueDate: item.dueDate || null,
        notes: item.notes?.trim() || null,
      }));

    const payload: Record<string, unknown> = {
      youthId: formYouthId,
      title: formTitle,
      goal: formDescription || null,
      startDate: formStartDate || null,
      endDate: formEndDate || null,
    };
    if (planMilestones.length > 0) payload.milestones = planMilestones;

    try {
      await adminApi.post<PlanRead>("/api/plans", payload);
      await queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      addToast({ title: "Reja qo'shildi", type: "success" });
      setIsAddDialogOpen(false);
      setAiRecommendation(null);
      setSelectedYouthForAI("");
    } catch {
      addToast({ title: "Xatolik", description: "Reja qo'shishda xato yuz berdi", type: "error" });
    }
  };

  // ── Update Progress ───────────────────────────────────────────────────
  const openProgressDialog = (plan: PlanRead) => {
    setSelectedPlan(plan);
    setProgressValue(plan.progress);
    setProgressComment("");
    setProgressFile(null);
    setIsProgressDialogOpen(true);
  };

  const handleUpdateProgress = async () => {
    if (!selectedPlan) return;
    try {
      const body: Record<string, unknown> = {
        progress: progressValue,
        status: progressValue === 100 ? "completed" : "in_progress",
      };
      if (progressComment.trim()) body.notes = progressComment.trim();

      const fd = new FormData();
      fd.append("progress", String(progressValue));
      fd.append("status", body.status as string);
      if (progressComment.trim()) fd.append("notes", progressComment.trim());
      if (progressFile) fd.append("attachment", progressFile, progressFile.name);

      const token = getAccessToken();
      const res = await fetch(`${config.apiUrl}/api/plans/${selectedPlan.id}`, {
        method: "PATCH",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error(res.statusText);

      await queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      setIsProgressDialogOpen(false);
      addToast({ title: "Progress yangilandi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Progressni yangilashda xato", type: "error" });
    }
  };

  const openCompleteDialog = (plan: PlanRead) => {
    setCompletePlan(plan);
    setCompleteNote("");
    setCompleteFile(null);
    setIsCompleteDialogOpen(true);
  };

  const handleMarkCompleted = async () => {
    if (!completePlan) return;
    try {
      const fd = new FormData();
      fd.append("progress", "100");
      fd.append("status", "completed");
      if (completeNote.trim()) fd.append("notes", completeNote.trim());
      if (completeFile) fd.append("attachment", completeFile, completeFile.name);

      const token = getAccessToken();
      const res = await fetch(`${config.apiUrl}/api/plans/${completePlan.id}`, {
        method: "PATCH",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error(res.statusText);

      await queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      setIsCompleteDialogOpen(false);
      addToast({ title: "Bajarildi deb belgilandi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Holatni yangilashda xato", type: "error" });
    }
  };

  const confirmDeletePlan = async () => {
    if (!deleteCandidate) return;
    try {
      await adminApi.delete(`/api/plans/${deleteCandidate.id}`);
      await queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      addToast({ title: "O'chirildi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "O'chirishda xato yuz berdi", type: "error" });
    }
    setDeleteCandidate(null);
  };

  // ── Render ────────────────────────────────────────────────────────────
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

      {/* AI panel for masul_hodim */}
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
              <Select value={selectedYouthForAI} onValueChange={setSelectedYouthForAI}>
                <SelectTrigger className="flex-1" id="ai-youth-select">
                  <SelectValue placeholder="Yosh tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {formYouthList
                    .filter((y) => !isMasul || y.masulId === currentUser?.id)
                    .map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.fullName} — {y.category ?? "—"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                id="btn-ai-recommend"
                disabled={!selectedYouthForAI || aiLoading}
                onClick={() => fetchAIRecommendation(selectedYouthForAI)}
                className="gap-2 shrink-0"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiLoading ? "Tahlil qilinmoqda..." : "AI tavsiyasi"}
              </Button>
            </div>
            {aiRecommendation && (
              <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-background space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{aiRecommendation.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{aiRecommendation.description}</p>
                  </div>
                  <button onClick={() => setAiRecommendation(null)} className="text-muted-foreground hover:text-foreground shrink-0">
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
                <Button id="btn-accept-ai-plan" size="sm" className="w-full gap-2" onClick={acceptAIRecommendation}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Qabul qilish va formani to'ldirish
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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
                <SelectItem value="draft">Qoralama</SelectItem>
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
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
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
              {plansLoading ? (
                <TableRow>
                  <TableCell colSpan={isMasul ? 6 : 7} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredPlans.length === 0 ? (
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
                          <p className="text-sm text-muted-foreground line-clamp-1">{plan.goal ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{getYouthName(plan.youthId)}</span>
                    </TableCell>
                    {!isMasul && (
                      <TableCell>
                        <span className="text-sm">{getMasulName(plan)}</span>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="text-sm">
                        <p>{plan.startDate ?? "—"}</p>
                        <p className="text-muted-foreground">{plan.endDate ?? "—"}</p>
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
                          {plan.status !== "completed" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openProgressDialog(plan)}>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Progressni yangilash
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openCompleteDialog(plan)}>
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
                                onClick={() => setDeleteCandidate(plan)}
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
          </div>

          {/* Mobile card list */}
          <div className="md:hidden">
            {plansLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Rejalar topilmadi</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredPlans.map((plan) => (
                  <div key={plan.id} className="p-4">
                    {/* Row 1: icon + title + status */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{plan.title}</p>
                          {plan.goal && <p className="text-xs text-muted-foreground truncate">{plan.goal}</p>}
                        </div>
                      </div>
                      {getStatusBadge(plan.status)}
                    </div>
                    {/* Row 2: youth + masul + dates + progress */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 pl-[52px] text-sm">
                      <span className="font-medium">{getYouthName(plan.youthId)}</span>
                      {!isMasul && <span className="text-muted-foreground text-xs">{getMasulName(plan)}</span>}
                      {(plan.startDate || plan.endDate) && (
                        <span className="text-xs text-muted-foreground">{plan.startDate ?? "—"} → {plan.endDate ?? "—"}</span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mb-3 pl-[52px]">
                      <Progress value={plan.progress} className="flex-1 h-2" />
                      <span className="text-xs font-medium w-8 text-right">{plan.progress}%</span>
                    </div>
                    {/* Row 3: action button */}
                    <div className="flex items-center gap-2 pl-[52px]">
                      <Button size="sm" variant="outline" className="h-8 text-xs bg-transparent"
                        onClick={() => { setSelectedPlan(plan); setIsViewDialogOpen(true); }}>
                        <Eye className="h-3.5 w-3.5 mr-1" />Ko'rish
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Plan Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Yangi reja qo'shish</DialogTitle>
            <DialogDescription>Individual ishlash rejasini yarating</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto">
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
              <Label htmlFor="plan-description">Maqsad</Label>
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
                  {formYouthList
                    .filter((y) => !isMasul || y.masulId === currentUser?.id)
                    .map((y) => (
                      <SelectItem key={y.id} value={y.id} disabled={!y.masulId}>
                        <span className={!y.masulId ? "text-muted-foreground" : undefined}>
                          {y.fullName}{!y.masulId && " (mas'ul yo'q)"}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="plan-start">Boshlanish sanasi *</Label>
                <Input id="plan-start" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-end">Tugash sanasi *</Label>
                <Input id="plan-end" type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
              </div>
            </div>
            {/* Milestones */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Bosqichlar (milestones)</Label>
                <Button
                  type="button" variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => setMilestones([...milestones, { week: milestones.length + 1, target: "", dueDate: "", notes: "" }])}
                >
                  + Bosqich qo'shish
                </Button>
              </div>
              <div className="overflow-y-auto max-h-[280px] space-y-3 pr-1">
                {milestones.map((ms, idx) => (
                  <div key={idx} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{ms.week}-hafta</span>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <Input
                          type="date" value={ms.dueDate || ""}
                          onChange={(e) => { const u = [...milestones]; u[idx] = { ...u[idx], dueDate: e.target.value }; setMilestones(u); }}
                          className="text-sm h-7 w-36"
                        />
                        {milestones.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                            onClick={() => setMilestones(milestones.filter((_, i) => i !== idx))}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea
                      value={ms.target}
                      onChange={(e) => { const u = [...milestones]; u[idx] = { ...u[idx], target: e.target.value }; setMilestones(u); }}
                      placeholder={`${ms.week}-hafta maqsadi`}
                      className="text-sm min-h-[60px] resize-none" rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Bekor qilish</Button>
            <Button id="btn-save-plan" onClick={handleAddPlan}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Plan Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Reja ma'lumotlari</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedPlan.title}</h3>
                  {getStatusBadge(selectedPlan.status)}
                </div>
              </div>
              {selectedPlan.goal && <p className="text-muted-foreground text-sm">{selectedPlan.goal}</p>}
              <div className="grid gap-3">
                {[
                  { label: "Yosh", val: getYouthName(selectedPlan.youthId) },
                  { label: "Mas'ul hodim", val: getMasulName(selectedPlan) },
                  { label: "Boshlanish sanasi", val: selectedPlan.startDate ?? "—" },
                  { label: "Tugash sanasi", val: selectedPlan.endDate ?? "—" },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Progress</span>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedPlan.progress} className="w-24 h-2" />
                    <span className="font-medium">{selectedPlan.progress}%</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedPlan.notes && (
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Izoh</p>
                  <p className="text-sm">{selectedPlan.notes}</p>
                </div>
              )}

              {/* Attachments */}
              {selectedPlan.attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Fayllar</p>
                  {selectedPlan.attachments.map((att, i) => (
                    <PlanFilePreview key={i} att={att} onFullscreen={setLightboxUrl} />
                  ))}
                </div>
              )}

              <div className="md:hidden flex flex-wrap gap-2 pt-2">
                {selectedPlan.status !== "completed" && (
                  <>
                    <Button className="flex-1" onClick={() => { setIsViewDialogOpen(false); openProgressDialog(selectedPlan); }}>
                      <PlayCircle className="mr-2 h-4 w-4" />Progressni yangilash
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => { setIsViewDialogOpen(false); openCompleteDialog(selectedPlan); }}>
                      <CheckCircle className="mr-2 h-4 w-4" />Bajarildi
                    </Button>
                  </>
                )}
                {canDelete && (
                  <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => { setIsViewDialogOpen(false); setDeleteCandidate(selectedPlan); }}>
                    <Trash2 className="mr-2 h-4 w-4" />O'chirish
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Progress Update Dialog */}
      <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <DialogContent className="sm:max-w-[400px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Progressni yangilash</DialogTitle>
            <DialogDescription>{selectedPlan?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2 overflow-y-auto flex-1 pr-1">
            {/* Existing notes/attachments from plan */}
            {(selectedPlan?.notes || (selectedPlan?.attachments?.length ?? 0) > 0) && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Oldingi yangilanish</p>
                {selectedPlan?.notes && (
                  <p className="text-sm">{selectedPlan.notes}</p>
                )}
                {selectedPlan?.attachments?.map((att, i) => (
                  <PlanFilePreview key={i} att={att} onFullscreen={setLightboxUrl} />
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Bajarilish darajasi</Label>
                <span className="text-2xl font-bold text-primary">{progressValue}%</span>
              </div>
              <input
                id="progress-slider" type="range" min={0} max={100} step={5} value={progressValue}
                onChange={(e) => setProgressValue(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
            {progressValue === 100 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 text-accent text-sm">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Reja bajarilgan deb belgilanadi
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="progress-comment">Izoh (ixtiyoriy)</Label>
              <Textarea
                id="progress-comment" value={progressComment}
                onChange={(e) => setProgressComment(e.target.value)}
                placeholder="Bu yangilanish haqida qisqacha..." rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Fayl biriktirish (ixtiyoriy)</Label>
              <input
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-border file:text-xs file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                onChange={(e) => setProgressFile(e.target.files?.[0] ?? null)}
              />
              {progressFile && (
                progressFile.type.startsWith("image/") ? (
                  <div className="relative group rounded-lg overflow-hidden border bg-muted/30">
                    <img
                      src={URL.createObjectURL(progressFile)}
                      alt={progressFile.name}
                      className="w-full max-h-48 object-contain"
                    />
                    <button
                      onClick={() => setLightboxUrl(URL.createObjectURL(progressFile))}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="To'liq ekranda ko'rish"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-muted-foreground px-2 py-1.5">{progressFile.name} ({Math.round(progressFile.size / 1024)} KB)</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Tanlandi: {progressFile.name} ({Math.round(progressFile.size / 1024)} KB)</p>
                )
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProgressDialogOpen(false)}>Bekor</Button>
            <Button id="btn-save-progress" onClick={handleUpdateProgress}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bajarildi Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Bajarildi deb belgilash</DialogTitle>
            <DialogDescription>{completePlan?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 text-accent text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Progress 100% ga o'rnatiladi va reja yakunlanadi
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-note">Izoh (ixtiyoriy)</Label>
              <Textarea
                id="complete-note"
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                placeholder="Yakunlash haqida qisqacha..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Fayl biriktirish (ixtiyoriy)</Label>
              <input
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-border file:text-xs file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                onChange={(e) => setCompleteFile(e.target.files?.[0] ?? null)}
              />
              {completeFile && (
                completeFile.type.startsWith("image/") ? (
                  <div className="relative group rounded-lg overflow-hidden border bg-muted/30">
                    <img src={URL.createObjectURL(completeFile)} alt={completeFile.name} className="w-full max-h-36 object-contain" />
                    <button
                      onClick={() => setLightboxUrl(URL.createObjectURL(completeFile))}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-muted-foreground px-2 py-1">{completeFile.name} ({Math.round(completeFile.size / 1024)} KB)</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Tanlandi: {completeFile.name} ({Math.round(completeFile.size / 1024)} KB)</p>
                )
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>Bekor</Button>
            <Button onClick={handleMarkCompleted}>
              <CheckCircle className="mr-2 h-4 w-4" />Bajarildi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteCandidate)}
        title="Rejani o'chirish"
        description={
          deleteCandidate
            ? `"${deleteCandidate.title}" rejasini o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.`
            : undefined
        }
        onConfirm={confirmDeletePlan}
        onCancel={() => setDeleteCandidate(null)}
      />

      {/* Lightbox — portal to document.body so Radix Dialog doesn't intercept pointer events */}
      {lightboxUrl && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 cursor-zoom-out"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Fayl ko'rinishi"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
