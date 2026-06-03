"use client";

import React from "react";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { usePageDataContext } from "@/lib/page-data-context";
import { ResourcePagination } from "@/components/app/resource-pagination";
import {
  useForceAssignMasul,
  useForceYouthStatus,
  useRestoreYouth,
} from "@/lib/api/hooks/use-admin";
import { downloadReport, useMeetings, usePlans } from "@/lib/api/hooks/use-core-api";
import type { Youth, ToshkentDistrict } from "@/lib/types";
import { TOSHKENT_VILOYATI_DISTRICTS } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DistrictSelector,
  DistrictBadge,
} from "@/components/ui/district-selector";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AIYouthAnalysis } from "@/components/ai/ai-youth-analysis";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  UserPlus,
  Trash2,
  Download,
  FileText,
  Calendar,
  Award,
  Users,
  X,
  Phone,
  MapPin,
  Clock,
  Activity,
  CheckCircle,
  UserMinus,
  AlertTriangle,
  Brain,
} from "lucide-react";

export function YoshlarPage() {
  const {
    currentUser,
    selectedDistrict,
    getVisibleYouth,
    getVisibleMasullar,
    getMasullarsForDistrict,
    addYouth,
    updateYouth,
    assignYouthToMasul,
    removeYouth,
    validateDistrictAssignment,
    canViewAllDistricts,
    showToast,
  } = useApp();

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isMasul = currentUser?.role === "masul_hodim";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const canEdit = isAdmin || isDirektor || isTashkilotDirektor;
  const canAssign = isAdmin || isTashkilotDirektor;
  const forceAssignMasul = useForceAssignMasul();
  const forceYouthStatus = useForceYouthStatus();
  const restoreYouth = useRestoreYouth();

  const visibleYouth = getVisibleYouth();
  const visibleMasullar = getVisibleMasullar();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<ToshkentDistrict | "all">("all");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isAIAnalysisOpen, setIsAIAnalysisOpen] = useState(false);

  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [selectedMasulId, setSelectedMasulId] = useState<string>("");
  const [removeReason, setRemoveReason] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYouthPlansPage, setSelectedYouthPlansPage] = useState(1);
  const [selectedYouthMeetingsPage, setSelectedYouthMeetingsPage] = useState(1);
  const [newYouthDistrict, setNewYouthDistrict] = useState<ToshkentDistrict | "">(
    currentUser?.districtId || ""
  );
  const selectedYouthId = selectedYouth?.id ?? "";
  const selectedYouthPlansQuery = usePlans({
    youthId: selectedYouthId,
    page: selectedYouthPlansPage,
    limit: 50,
    enabled: isViewDialogOpen && Boolean(selectedYouthId),
  });
  const selectedYouthMeetingsQuery = useMeetings({
    youthId: selectedYouthId,
    page: selectedYouthMeetingsPage,
    limit: 50,
    enabled: isViewDialogOpen && Boolean(selectedYouthId),
  });
  const selectedYouthPlans = selectedYouthPlansQuery.data?.data ?? [];
  const selectedYouthMeetings = selectedYouthMeetingsQuery.data?.data ?? [];
  const selectedYouthPlansTotal = selectedYouthPlansQuery.data?.total ?? 0;
  const selectedYouthPlansLimit = selectedYouthPlansQuery.data?.limit ?? 50;
  const selectedYouthPlansCurrentPage = selectedYouthPlansQuery.data?.page ?? selectedYouthPlansPage;
  const selectedYouthPlansTotalPages = Math.max(
    1,
    Math.ceil(selectedYouthPlansTotal / selectedYouthPlansLimit)
  );
  const selectedYouthPlansFirst =
    selectedYouthPlansTotal === 0
      ? 0
      : (selectedYouthPlansCurrentPage - 1) * selectedYouthPlansLimit + 1;
  const selectedYouthPlansLast = Math.min(
    selectedYouthPlansCurrentPage * selectedYouthPlansLimit,
    selectedYouthPlansTotal
  );
  const selectedYouthMeetingsTotal = selectedYouthMeetingsQuery.data?.total ?? 0;
  const selectedYouthMeetingsLimit = selectedYouthMeetingsQuery.data?.limit ?? 50;
  const selectedYouthMeetingsCurrentPage =
    selectedYouthMeetingsQuery.data?.page ?? selectedYouthMeetingsPage;
  const selectedYouthMeetingsTotalPages = Math.max(
    1,
    Math.ceil(selectedYouthMeetingsTotal / selectedYouthMeetingsLimit)
  );
  const selectedYouthMeetingsFirst =
    selectedYouthMeetingsTotal === 0
      ? 0
      : (selectedYouthMeetingsCurrentPage - 1) * selectedYouthMeetingsLimit + 1;
  const selectedYouthMeetingsLast = Math.min(
    selectedYouthMeetingsCurrentPage * selectedYouthMeetingsLimit,
    selectedYouthMeetingsTotal
  );
  const pageData = usePageDataContext();
  const effectiveDistrict =
    districtFilter !== "all"
      ? districtFilter
      : selectedDistrict !== "all"
        ? selectedDistrict
        : undefined;

  useEffect(() => {
    pageData?.setResourceParams("youth", {
      districtId: effectiveDistrict,
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: searchQuery.trim() || undefined,
    });
  }, [effectiveDistrict, pageData, searchQuery, statusFilter]);

  useEffect(() => {
    setSelectedYouthPlansPage(1);
    setSelectedYouthMeetingsPage(1);
  }, [isViewDialogOpen, selectedYouthId]);

  const filteredYouth = visibleYouth;

  const handleExport = () => {
    const promise = effectiveDistrict
      ? downloadReport.district(effectiveDistrict)
      : downloadReport.agency();
    void promise
      .then(() => showToast("Export yuklab olindi", "success"))
      .catch((error) =>
        showToast(error instanceof Error ? error.message : "Export yuklanmadi", "error")
      );
  };

  // Get masullar for the selected youth's district (for assignment)
  const getAvailableMasullar = (youth: Youth) => {
    return getMasullarsForDistrict(youth.districtId);
  };

  const handleAddYouth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    await new Promise((r) => setTimeout(r, 500));

    if (!newYouthDistrict) {
      setIsLoading(false);
      return;
    }

    addYouth({
      fullName: formData.get("fullName") as string,
      birthDate: formData.get("birthDate") as string,
      address: formData.get("address") as string,
      districtId: newYouthDistrict,
      phone: formData.get("phone") as string,
      category: "Boshqa",
      notes: (formData.get("notes") as string) || undefined,
      status: "active",
      aiScore: Math.floor(Math.random() * 30) + 50,
      plansCount: 0,
      meetingsCount: 0,
    });

    setIsLoading(false);
    setIsAddDialogOpen(false);
    setNewYouthDistrict(currentUser?.districtId || "");
  };

  const handleEditYouth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedYouth) return;
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    await new Promise((r) => setTimeout(r, 500));

    updateYouth(selectedYouth.id, {
      fullName: formData.get("fullName") as string,
      birthDate: formData.get("birthDate") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
      notes: (formData.get("notes") as string) || undefined,
    });

    setIsLoading(false);
    setIsEditDialogOpen(false);
    setSelectedYouth(null);
  };

  const handleAssignYouth = async () => {
    if (!selectedYouth || !selectedMasulId) return;
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 500));

    if (isAdmin) {
      try {
        const result = await forceAssignMasul.mutateAsync({
          youthId: selectedYouth.id,
          masulId: selectedMasulId,
          overrideDistrict: true,
        });
        updateYouth(selectedYouth.id, {
          assignedMasulId: result.masulId ?? selectedMasulId,
          status: result.status,
        });
        setIsAssignDialogOpen(false);
        setSelectedYouth(null);
        setSelectedMasulId("");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Validate district assignment
    const isValid = validateDistrictAssignment(selectedYouth.districtId, selectedMasulId);
    if (!isValid) {
      setIsLoading(false);
      return;
    }

    assignYouthToMasul(selectedYouth.id, selectedMasulId);

    setIsLoading(false);
    setIsAssignDialogOpen(false);
    setSelectedYouth(null);
    setSelectedMasulId("");
  };

  const handleRemoveYouth = async () => {
    if (!selectedYouth || !removeReason) return;
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 500));
    if (isAdmin) {
      try {
        const result = await forceYouthStatus.mutateAsync({
          youthId: selectedYouth.id,
          status: "removed",
        });
        updateYouth(selectedYouth.id, { status: result.status });
      } finally {
        setIsLoading(false);
        setIsRemoveDialogOpen(false);
        setSelectedYouth(null);
        setRemoveReason("");
      }
      return;
    }

    removeYouth(selectedYouth.id, removeReason);

    setIsLoading(false);
    setIsRemoveDialogOpen(false);
    setSelectedYouth(null);
    setRemoveReason("");
  };

  const handleRestoreYouth = async (youth: Youth) => {
    setIsLoading(true);
    try {
      const result = await restoreYouth.mutateAsync(youth.id);
      updateYouth(youth.id, { status: result.status });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-accent text-accent-foreground">Faol</Badge>;
      case "inactive":
        return <Badge variant="secondary">Nofaol</Badge>;
      case "graduated":
        return <Badge className="bg-chart-1 text-primary-foreground">Yakunlangan</Badge>;
      case "removed":
        return <Badge className="bg-destructive text-destructive-foreground">Chiqarilgan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAiScoreColor = (score: number) => {
    if (score >= 80) return "text-accent";
    if (score >= 60) return "text-chart-3";
    if (score >= 40) return "text-orange-500";
    return "text-destructive";
  };

  const getPlanStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-accent/10 text-accent border-accent/20">Bajarilgan</Badge>;
      case "in_progress":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Jarayonda</Badge>;
      case "draft":
        return <Badge variant="secondary">Qoralama</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Bekor qilingan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMeetingStatusBadge = (status: string) => {
    switch (status) {
      case "attended":
        return <Badge className="bg-accent/10 text-accent border-accent/20">O'tkazildi</Badge>;
      case "scheduled":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Rejalashtirilgan</Badge>;
      case "no_show":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Kelmadi</Badge>;
      case "rescheduled":
        return <Badge variant="secondary">Ko'chirildi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Yoshlar ro'yxati</h1>
          <p className="text-muted-foreground">
            {isMasul
              ? "Sizga biriktirilgan yoshlar"
              : `Jami ${filteredYouth.length} ta yosh`}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yosh qo'shish
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ism yoki telefon bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {canViewAllDistricts() && (
              <Select
                value={districtFilter}
                onValueChange={(val) => setDistrictFilter(val as ToshkentDistrict | "all")}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tuman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha tumanlar</SelectItem>
                  {TOSHKENT_VILOYATI_DISTRICTS.map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Holat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="active">Faol</SelectItem>
                <SelectItem value="graduated">Yakunlangan</SelectItem>
                <SelectItem value="removed">Chiqarilgan</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-transparent" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>F.I.O</TableHead>
                <TableHead>Tuman</TableHead>
                <TableHead>Izoh</TableHead>
                <TableHead>Mas'ul</TableHead>
                <TableHead>AI ball</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredYouth.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    Yoshlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filteredYouth.map((youth) => (
                  <TableRow key={youth.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {youth.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{youth.fullName}</p>
                          <p className="text-sm text-muted-foreground">{youth.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DistrictBadge districtId={youth.districtId} size="sm" />
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-2 text-sm text-muted-foreground">
                        {youth.notes || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {youth.assignedMasulName ? (
                        <span className="text-sm">{youth.assignedMasulName}</span>
                      ) : (
                        <Badge variant="secondary" className="text-orange-600 bg-orange-50">
                          Biriktirilmagan
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${getAiScoreColor(youth.aiScore)}`}>
                          {youth.aiScore}%
                        </span>
                        <Progress value={youth.aiScore} className="w-16 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(youth.status)}</TableCell>
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
                              setSelectedYouth(youth);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ko'rish
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedYouth(youth);
                              setIsAIAnalysisOpen(true);
                            }}
                            className="text-primary"
                          >
                            <Brain className="h-4 w-4 mr-2" />
                            AI Tahlil
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedYouth(youth);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Tahrirlash
                            </DropdownMenuItem>
                          )}
                          {canAssign && !youth.assignedMasulId && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedYouth(youth);
                                setIsAssignDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Biriktirish
                            </DropdownMenuItem>
                          )}
                          {canEdit && youth.status === "active" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedYouth(youth);
                                  setIsRemoveDialogOpen(true);
                                }}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Chiqarish
                              </DropdownMenuItem>
                            </>
                          )}
                          {isAdmin && youth.status !== "active" && (
                            <DropdownMenuItem onClick={() => void handleRestoreYouth(youth)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Admin restore
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ResourcePagination resource="youth" />
        </CardContent>
      </Card>

      {/* Add Youth Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yangi yosh qo'shish</DialogTitle>
            <DialogDescription>
              Toshkent viloyati yoshlar ro'yxatiga yangi yosh qo'shish
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddYouth}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">F.I.O *</Label>
                <Input id="fullName" name="fullName" required placeholder="To'liq ism" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="birthDate">Tug'ilgan sana *</Label>
                  <Input id="birthDate" name="birthDate" type="date" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    required
                    placeholder="+998901234567"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="grid gap-2">
                  <Label>Tuman *</Label>
                  {isTashkilotDirektor && currentUser?.districtId ? (
                    <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{currentUser.districtId}</span>
                      <input type="hidden" name="districtId" value={currentUser.districtId} />
                    </div>
                  ) : (
                    <Select
                      value={newYouthDistrict}
                      onValueChange={(val) => setNewYouthDistrict(val as ToshkentDistrict)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tumanni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {TOSHKENT_VILOYATI_DISTRICTS.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Manzil *</Label>
                <Input id="address" name="address" required placeholder="To'liq manzil" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Izoh</Label>
                <Textarea id="notes" name="notes" placeholder="Qo'shimcha izoh" />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="bg-transparent"
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isLoading || !newYouthDistrict}>
                {isLoading ? "Saqlanmoqda..." : "Qo'shish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Youth Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedYouth?.fullName}
              {selectedYouth && getStatusBadge(selectedYouth.status)}
            </DialogTitle>
            <DialogDescription>Yoshning to'liq ma'lumotlari</DialogDescription>
          </DialogHeader>
          {selectedYouth && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Ma'lumotlar</TabsTrigger>
                <TabsTrigger value="plans">
                  Rejalar ({selectedYouthPlansQuery.data?.total ?? selectedYouth.plansCount})
                </TabsTrigger>
                <TabsTrigger value="meetings">
                  Uchrashuvlar ({selectedYouthMeetingsQuery.data?.total ?? selectedYouth.meetingsCount})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedYouth.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedYouth.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Tug'ilgan: {selectedYouth.birthDate}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Tuman:</span>
                      <div className="mt-1">
                        <DistrictBadge districtId={selectedYouth.districtId} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Izoh</span>
                      <p className="font-medium whitespace-pre-wrap">
                        {selectedYouth.notes || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Mas'ul hodim</span>
                      <p className="font-medium">
                        {selectedYouth.assignedMasulName || "Biriktirilmagan"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">AI ball</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-2xl font-bold ${getAiScoreColor(selectedYouth.aiScore)}`}
                        >
                          {selectedYouth.aiScore}%
                        </span>
                        <Progress value={selectedYouth.aiScore} className="flex-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="plans" className="mt-4">
                {selectedYouthPlansQuery.isPending ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 border border-gray-300 bg-gray-200 dark:border-gray-700 dark:bg-gray-800" />
                    <Skeleton className="h-20 border border-gray-300 bg-gray-200 dark:border-gray-700 dark:bg-gray-800" />
                  </div>
                ) : selectedYouthPlansQuery.isError ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    Rejalarni yuklab bo'lmadi. Backend javob bermadi.
                  </div>
                ) : selectedYouthPlans.length > 0 ? (
                  <div className="space-y-3">
                    {selectedYouthPlans.map((plan) => (
                      <div key={plan.id} className="rounded-md border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-medium text-foreground">{plan.title}</h4>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {plan.goal || "Maqsad kiritilmagan"}
                            </p>
                          </div>
                          {getPlanStatusBadge(plan.status)}
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                          <span>Boshlanish: {formatDate(plan.startDate)}</span>
                          <span>Tugash: {formatDate(plan.endDate)}</span>
                          <span>Progress: {plan.progress}%</span>
                        </div>
                        <Progress value={plan.progress} className="mt-3" />
                      </div>
                    ))}
                    {selectedYouthPlansTotal > selectedYouthPlansLimit && (
                      <div className="flex flex-col gap-3 border-t pt-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          {selectedYouthPlansFirst}-{selectedYouthPlansLast} / {selectedYouthPlansTotal} ta
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1 bg-transparent"
                            disabled={selectedYouthPlansCurrentPage <= 1}
                            onClick={() => setSelectedYouthPlansPage((current) => Math.max(1, current - 1))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Oldingi
                          </Button>
                          <span className="min-w-16 text-center">
                            {selectedYouthPlansCurrentPage}/{selectedYouthPlansTotalPages}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1 bg-transparent"
                            disabled={selectedYouthPlansCurrentPage >= selectedYouthPlansTotalPages}
                            onClick={() => setSelectedYouthPlansPage((current) => current + 1)}
                          >
                            Keyingi
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Hozircha rejalar yo'q</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="meetings" className="mt-4">
                {selectedYouthMeetingsQuery.isPending ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 border border-gray-300 bg-gray-200 dark:border-gray-700 dark:bg-gray-800" />
                    <Skeleton className="h-20 border border-gray-300 bg-gray-200 dark:border-gray-700 dark:bg-gray-800" />
                  </div>
                ) : selectedYouthMeetingsQuery.isError ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    Uchrashuvlarni yuklab bo'lmadi. Backend javob bermadi.
                  </div>
                ) : selectedYouthMeetings.length > 0 ? (
                  <div className="space-y-3">
                    {selectedYouthMeetings.map((meeting) => (
                      <div key={meeting.id} className="rounded-md border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-medium text-foreground">
                              {meeting.type || "Uchrashuv"}
                            </h4>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {meeting.agenda || "Kun tartibi kiritilmagan"}
                            </p>
                          </div>
                          {getMeetingStatusBadge(meeting.attendanceStatus)}
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          <span>Sana: {formatDate(meeting.scheduledAt)}</span>
                          <span>Joy: {meeting.location || "-"}</span>
                        </div>
                        {meeting.attendanceNotes && (
                          <p className="mt-3 text-sm text-muted-foreground">
                            {meeting.attendanceNotes}
                          </p>
                        )}
                      </div>
                    ))}
                    {selectedYouthMeetingsTotal > selectedYouthMeetingsLimit && (
                      <div className="flex flex-col gap-3 border-t pt-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          {selectedYouthMeetingsFirst}-{selectedYouthMeetingsLast} / {selectedYouthMeetingsTotal} ta
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1 bg-transparent"
                            disabled={selectedYouthMeetingsCurrentPage <= 1}
                            onClick={() => setSelectedYouthMeetingsPage((current) => Math.max(1, current - 1))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Oldingi
                          </Button>
                          <span className="min-w-16 text-center">
                            {selectedYouthMeetingsCurrentPage}/{selectedYouthMeetingsTotalPages}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1 bg-transparent"
                            disabled={selectedYouthMeetingsCurrentPage >= selectedYouthMeetingsTotalPages}
                            onClick={() => setSelectedYouthMeetingsPage((current) => current + 1)}
                          >
                            Keyingi
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Hozircha uchrashuvlar yo'q</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Youth Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yoshni tahrirlash</DialogTitle>
            <DialogDescription>Ma'lumotlarni o'zgartirish</DialogDescription>
          </DialogHeader>
          {selectedYouth && (
            <form onSubmit={handleEditYouth}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-fullName">F.I.O</Label>
                  <Input
                    id="edit-fullName"
                    name="fullName"
                    defaultValue={selectedYouth.fullName}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-birthDate">Tug'ilgan sana</Label>
                    <Input
                      id="edit-birthDate"
                      name="birthDate"
                      type="date"
                      defaultValue={selectedYouth.birthDate}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone">Telefon</Label>
                    <Input
                      id="edit-phone"
                      name="phone"
                      defaultValue={selectedYouth.phone}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Tuman</Label>
                  <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 truncate">{selectedYouth.districtId}</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-address">Manzil</Label>
                  <Input
                    id="edit-address"
                    name="address"
                    defaultValue={selectedYouth.address}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-notes">Izoh</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    defaultValue={selectedYouth.notes}
                    placeholder="Qo'shimcha izoh"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="bg-transparent"
                >
                  Bekor qilish
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Youth Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mas'ulga biriktirish</DialogTitle>
            <DialogDescription>
              {selectedYouth?.fullName} - {selectedYouth?.districtId}
            </DialogDescription>
          </DialogHeader>
          {selectedYouth && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Muhim eslatma</p>
                    <p className="text-orange-600">
                      Yoshni faqat o'z tumanidagi mas'ulga biriktirish mumkin.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Yoshning tumani: <strong>{selectedYouth.districtId}</strong>
                </span>
              </div>

              <div className="grid gap-2">
                <Label>Mas'ul hodim</Label>
                <Select value={selectedMasulId} onValueChange={setSelectedMasulId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mas'ulni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMasullar(selectedYouth).filter((masul) => masul.id).length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Bu tumanda mas'ul hodim yo'q
                      </div>
                    ) : (
                      getAvailableMasullar(selectedYouth).filter((masul) => masul.id).map((masul) => (
                        <SelectItem key={masul.id} value={masul.id}>
                          <div className="flex items-center gap-2">
                            <span>{masul.fullName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {masul.assignedYouthCount} yosh
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedMasulId("");
              }}
              className="bg-transparent"
            >
              Bekor qilish
            </Button>
            <Button onClick={handleAssignYouth} disabled={isLoading || !selectedMasulId}>
              {isLoading ? "Biriktirilmoqda..." : "Biriktirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Youth Dialog */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yoshni ro'yxatdan chiqarish</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedYouth?.fullName} yoshlar ro'yxatidan chiqariladi. Bu amalni ortga qaytarib
              bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="removeReason">Chiqarish sababi *</Label>
            <Textarea
              id="removeReason"
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              placeholder="Sababni kiriting..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRemoveReason("");
                setSelectedYouth(null);
              }}
            >
              Bekor qilish
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveYouth}
              disabled={isLoading || !removeReason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Chiqarilmoqda..." : "Chiqarish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Youth Analysis Dialog */}
      {selectedYouth && isAIAnalysisOpen && (
        <Dialog open={isAIAnalysisOpen} onOpenChange={setIsAIAnalysisOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>AI Tahlil</DialogTitle>
              <DialogDescription>
                {selectedYouth.fullName} ning AI tahlili
              </DialogDescription>
            </DialogHeader>
            <AIYouthAnalysis youth={selectedYouth} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAIAnalysisOpen(false)}
                className="bg-transparent"
              >
                Yopish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
