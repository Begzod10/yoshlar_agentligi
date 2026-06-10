"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-context";
import { adminApi } from "@/lib/api/client";
import {
  useForceAssignMasul,
  useForceYouthStatus,
  useRestoreYouth,
} from "@/lib/api/hooks/use-admin";
import { youthCategories } from "@/lib/mock-data";
import type { YouthRead, MasulRead } from "@/lib/api/types";
import { TOSHKENT_VILOYATI_DISTRICTS, type ToshkentDistrict } from "@/lib/types";
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
  Edit,
  UserPlus,
  Trash2,
  FileText,
  Calendar,
  Users,
  Phone,
  MapPin,
  CheckCircle,
  UserMinus,
  AlertTriangle,
  Brain,
  Loader2,
} from "lucide-react";
import { DataPagination } from "@/components/ui/data-pagination";

export function AdminYoshlarPage() {
  const { currentUser, addToast, setCurrentPage } = useApp();
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isMasul = currentUser?.role === "masul_hodim";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const canEdit = isAdmin || isDirektor || isTashkilotDirektor;
  const canAssign = isAdmin || isTashkilotDirektor;

  const forceAssignMasul = useForceAssignMasul();
  const forceYouthStatus = useForceYouthStatus();
  const restoreYouth = useRestoreYouth();

  const LIMIT = 50;

  // ── Filter + page state ───────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const resetPage = () => setPage(1);

  // ── Data ──────────────────────────────────────────────────────────────
  const { data: youthData, isLoading: youthListLoading } = useQuery({
    queryKey: ["admin-youth", page, districtFilter, statusFilter],
    queryFn: () => {
      const q: Record<string, string | number | boolean | null | undefined> = { page, limit: LIMIT };
      if (districtFilter !== "all") q.district_id = districtFilter;
      if (statusFilter !== "all") q.status = statusFilter;
      return adminApi.get<{ data: YouthRead[]; total: number }>("/api/youth", { query: q });
    },
  });

  const { data: masullarData } = useQuery({
    queryKey: ["admin-masullar-youth"],
    queryFn: () =>
      adminApi.get<{ data: MasulRead[]; total: number }>("/api/masullar", {
        query: { page: 1, limit: 200 },
      }),
    staleTime: 5 * 60 * 1000,
  });

  const total = youthData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const masulMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const ms of masullarData?.data ?? []) m[ms.id] = ms.fullName;
    return m;
  }, [masullarData]);

  const getMasulName = (y: YouthRead) => y.masulName ?? (y.masulId ? (masulMap[y.masulId] ?? null) : null);

  // ── Dialog state ──────────────────────────────────────────────────────
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isAIAnalysisOpen, setIsAIAnalysisOpen] = useState(false);

  const [selectedYouth, setSelectedYouth] = useState<YouthRead | null>(null);
  const [selectedMasulId, setSelectedMasulId] = useState<string>("");
  const [removeReason, setRemoveReason] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [newYouthDistrict, setNewYouthDistrict] = useState<string>(
    currentUser?.districtId ?? ""
  );

  // Masullar filtered by selected youth's district (for assign dialog)
  const assignableMasullar = useMemo(
    () =>
      (masullarData?.data ?? []).filter(
        (m) => !selectedYouth || m.districtId === selectedYouth.districtId
      ),
    [masullarData, selectedYouth]
  );

  // ── Client-side filtering (category + search; district+status go to API) ──
  const filteredYouth = (youthData?.data ?? []).filter((y) => {
    if (isMasul && y.masulId !== currentUser?.id) return false;
    if (categoryFilter !== "all" && y.category !== categoryFilter) return false;
    const q = searchQuery.toLowerCase();
    return (
      y.fullName.toLowerCase().includes(q) ||
      (y.contact ?? "").includes(searchQuery)
    );
  });

  // ── CRUD handlers ─────────────────────────────────────────────────────
  const handleAddYouth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const fd = new FormData(e.currentTarget);
    if (!newYouthDistrict) { setIsLoading(false); return; }
    try {
      await adminApi.post("/api/youth", {
        fullName: fd.get("fullName") as string,
        contact: (fd.get("phone") as string) || null,
        dateOfBirth: (fd.get("birthDate") as string) || null,
        address: (fd.get("address") as string) || null,
        districtId: newYouthDistrict,
        category: (fd.get("category") as string) || null,
        notes: ((fd.get("notes") as string)?.trim()) || null,
        status: "active",
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-youth"] });
      setIsAddDialogOpen(false);
      setNewYouthDistrict(currentUser?.districtId ?? "");
      addToast({ title: "Yosh qo'shildi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Yosh qo'shishda xato yuz berdi", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditYouth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedYouth) return;
    setIsLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await adminApi.patch(`/api/youth/${selectedYouth.id}`, {
        fullName: fd.get("fullName") as string,
        contact: (fd.get("phone") as string) || null,
        dateOfBirth: (fd.get("birthDate") as string) || null,
        address: (fd.get("address") as string) || null,
        category: (fd.get("category") as string) || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-youth"] });
      setIsEditDialogOpen(false);
      setSelectedYouth(null);
      addToast({ title: "Ma'lumotlar yangilandi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Tahrirlashda xato yuz berdi", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignYouth = async () => {
    if (!selectedYouth || !selectedMasulId) return;
    setIsLoading(true);
    try {
      await forceAssignMasul.mutateAsync({
        youthId: selectedYouth.id,
        masulId: selectedMasulId,
        overrideDistrict: true,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-youth"] });
      setIsAssignDialogOpen(false);
      setSelectedYouth(null);
      setSelectedMasulId("");
      addToast({ title: "Biriktirildi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Biriktirishda xato yuz berdi", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveYouth = async () => {
    if (!selectedYouth || !removeReason) return;
    setIsLoading(true);
    try {
      await forceYouthStatus.mutateAsync({ youthId: selectedYouth.id, status: "removed" });
      await queryClient.invalidateQueries({ queryKey: ["admin-youth"] });
      setIsRemoveDialogOpen(false);
      setSelectedYouth(null);
      setRemoveReason("");
      addToast({ title: "Chiqarildi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Chiqarishda xato yuz berdi", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreYouth = async (youth: YouthRead) => {
    setIsLoading(true);
    try {
      await restoreYouth.mutateAsync(youth.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-youth"] });
      addToast({ title: "Tiklandi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Tiklashda xato yuz berdi", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-accent text-accent-foreground">Faol</Badge>;
      case "graduated":
        return <Badge className="bg-chart-1 text-primary-foreground">Yakunlangan</Badge>;
      case "removed":
        return <Badge className="bg-destructive text-destructive-foreground">Chiqarilgan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Yoshlar ro'yxati</h1>
          <p className="text-muted-foreground">
            {isMasul
              ? `Sizga biriktirilgan yoshlar — ${filteredYouth.length} ta`
              : `Jami ${filteredYouth.length} ta yosh`}
          </p>
        </div>
        {canEdit && !isMasul && (
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
            {(isAdmin || isDirektor) && (
              <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v); resetPage(); }}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tuman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha tumanlar</SelectItem>
                  {TOSHKENT_VILOYATI_DISTRICTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetPage(); }}>
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Kategoriya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha kategoriyalar</SelectItem>
                {youthCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>F.I.O</TableHead>
                <TableHead>Tuman</TableHead>
                <TableHead>Kategoriya</TableHead>
                {!isMasul && <TableHead>Mas'ul</TableHead>}
                <TableHead>Holat</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {youthListLoading ? (
                <TableRow>
                  <TableCell colSpan={isMasul ? 5 : 6} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredYouth.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMasul ? 5 : 6} className="text-center py-8 text-muted-foreground">
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
                            {youth.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{youth.fullName}</p>
                          <p className="text-sm text-muted-foreground">{youth.contact ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DistrictBadge districtId={youth.districtId as ToshkentDistrict} size="sm" />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{youth.category ?? "—"}</Badge>
                    </TableCell>
                    {!isMasul && (
                      <TableCell>
                        {getMasulName(youth) ? (
                          <span className="text-sm">{getMasulName(youth)}</span>
                        ) : (
                          <Badge variant="secondary" className="text-orange-600 bg-orange-50">
                            Biriktirilmagan
                          </Badge>
                        )}
                      </TableCell>
                    )}
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
                          <DropdownMenuItem onClick={() => { setSelectedYouth(youth); setIsViewDialogOpen(true); }}>
                            <Eye className="h-4 w-4 mr-2" />Ko'rish
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => { setSelectedYouth(youth); setIsAIAnalysisOpen(true); }}
                            className="text-primary"
                          >
                            <Brain className="h-4 w-4 mr-2" />AI Tahlil
                          </DropdownMenuItem>
                          {canEdit && !isMasul && (
                            <DropdownMenuItem onClick={() => { setSelectedYouth(youth); setIsEditDialogOpen(true); }}>
                              <Edit className="h-4 w-4 mr-2" />Tahrirlash
                            </DropdownMenuItem>
                          )}
                          {canAssign && !isMasul && !youth.masulId && (
                            <DropdownMenuItem onClick={() => { setSelectedYouth(youth); setIsAssignDialogOpen(true); }}>
                              <UserPlus className="h-4 w-4 mr-2" />Biriktirish
                            </DropdownMenuItem>
                          )}
                          {canEdit && !isMasul && youth.status === "active" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => { setSelectedYouth(youth); setIsRemoveDialogOpen(true); }}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />Chiqarish
                              </DropdownMenuItem>
                            </>
                          )}
                          {isAdmin && youth.status !== "active" && (
                            <DropdownMenuItem onClick={() => void handleRestoreYouth(youth)}>
                              <CheckCircle className="h-4 w-4 mr-2" />Admin restore
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
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <DataPagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={LIMIT}
        isLoading={youthListLoading}
        onPageChange={setPage}
        itemLabel="ta yosh"
      />

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
                  <Label htmlFor="birthDate">Tug'ilgan sana</Label>
                  <Input id="birthDate" name="birthDate" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" placeholder="+998901234567" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tuman *</Label>
                  {isTashkilotDirektor && currentUser?.districtId ? (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{currentUser.districtId}</span>
                    </div>
                  ) : (
                    <Select value={newYouthDistrict} onValueChange={setNewYouthDistrict}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tumanni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {TOSHKENT_VILOYATI_DISTRICTS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Kategoriya</Label>
                  <Select name="category">
                    <SelectTrigger>
                      <SelectValue placeholder="Kategoriyani tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {youthCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Manzil</Label>
                <Input id="address" name="address" placeholder="To'liq manzil" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Izoh</Label>
                <Textarea id="notes" name="notes" rows={3} placeholder="Qo'shimcha ma'lumot..." className="resize-none" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="bg-transparent">
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Ma'lumotlar</TabsTrigger>
                <TabsTrigger value="navigation">Sahifalar</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedYouth.contact ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedYouth.address ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Tug'ilgan: {selectedYouth.dateOfBirth ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Tuman:</span>
                      <div className="mt-1">
                        <DistrictBadge districtId={selectedYouth.districtId as ToshkentDistrict} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Kategoriya</span>
                      <p className="font-medium">{selectedYouth.category ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Mas'ul hodim</span>
                      <p className="font-medium">{getMasulName(selectedYouth) ?? "Biriktirilmagan"}</p>
                    </div>
                    {selectedYouth.notes && (
                      <div>
                        <span className="text-sm text-muted-foreground">Izoh</span>
                        <p className="text-sm">{selectedYouth.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="navigation" className="mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="bg-transparent" onClick={() => setCurrentPage("rejalar")}>
                    <FileText className="h-4 w-4 mr-2" />Rejalar
                  </Button>
                  <Button variant="outline" className="bg-transparent" onClick={() => setCurrentPage("uchrashuvlar")}>
                    <Calendar className="h-4 w-4 mr-2" />Uchrashuvlar
                  </Button>
                </div>
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
                  <Input id="edit-fullName" name="fullName" defaultValue={selectedYouth.fullName} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-birthDate">Tug'ilgan sana</Label>
                    <Input id="edit-birthDate" name="birthDate" type="date" defaultValue={selectedYouth.dateOfBirth ?? ""} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone">Telefon</Label>
                    <Input id="edit-phone" name="phone" defaultValue={selectedYouth.contact ?? ""} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Tuman</Label>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedYouth.districtId}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">O'zgartirib bo'lmaydi</Badge>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-address">Manzil</Label>
                  <Input id="edit-address" name="address" defaultValue={selectedYouth.address ?? ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-category">Kategoriya</Label>
                  <Select name="category" defaultValue={selectedYouth.category ?? ""}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {youthCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="bg-transparent">
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

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mas'ulga biriktirish</DialogTitle>
            <DialogDescription>
              {selectedYouth?.fullName} — {selectedYouth?.districtId}
            </DialogDescription>
          </DialogHeader>
          {selectedYouth && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Muhim eslatma</p>
                    <p className="text-orange-600">Yoshni faqat o'z tumanidagi mas'ulga biriktirish mumkin.</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Yoshning tumani: <strong>{selectedYouth.districtId}</strong></span>
              </div>
              <div className="grid gap-2">
                <Label>Mas'ul hodim</Label>
                <Select value={selectedMasulId} onValueChange={setSelectedMasulId}>
                  <SelectTrigger><SelectValue placeholder="Mas'ulni tanlang" /></SelectTrigger>
                  <SelectContent>
                    {assignableMasullar.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Bu tumanda mas'ul hodim yo'q</div>
                    ) : (
                      assignableMasullar.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAssignDialogOpen(false); setSelectedMasulId(""); }} className="bg-transparent">
              Bekor qilish
            </Button>
            <Button onClick={handleAssignYouth} disabled={isLoading || !selectedMasulId}>
              {isLoading ? "Biriktirilmoqda..." : "Biriktirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yoshni ro'yxatdan chiqarish</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedYouth?.fullName} yoshlar ro'yxatidan chiqariladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="removeReason">Chiqarish sababi *</Label>
            <Textarea
              id="removeReason" value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              placeholder="Sababni kiriting..." className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setRemoveReason(""); setSelectedYouth(null); }}>
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

      {/* AI Analysis Dialog */}
      {selectedYouth && isAIAnalysisOpen && (
        <Dialog open={isAIAnalysisOpen} onOpenChange={setIsAIAnalysisOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>AI Tahlil</DialogTitle>
              <DialogDescription>{selectedYouth.fullName} ning AI tahlili</DialogDescription>
            </DialogHeader>
            <AIYouthAnalysis youth={selectedYouth as never} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAIAnalysisOpen(false)} className="bg-transparent">
                Yopish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
