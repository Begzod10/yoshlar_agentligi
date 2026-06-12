"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-context";
import { adminApi } from "@/lib/api/client";
import type { MasulRead, OrganizationRead } from "@/lib/api/types";
import { TOSHKENT_VILOYATI_DISTRICTS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Trash2,
  UserCheck,
  Users,
  MapPin,
  Phone,
  Mail,
  Loader2,
  KeyRound,
} from "lucide-react";

export function AdminMasullarPage() {
  const { currentUser, addToast } = useApp();
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const canAdd = isAdmin || isDirektor || isTashkilotDirektor;
  const canEdit = isAdmin || isDirektor || isTashkilotDirektor;

  // ── Data ──────────────────────────────────────────────────────────────
  const { data: masullarData, isLoading } = useQuery({
    queryKey: ["admin-masullar"],
    queryFn: () =>
      adminApi.get<{ data: MasulRead[]; total: number }>("/api/masullar", {
        query: { page: 1, limit: 50 },
      }),
  });

  const { data: orgsData } = useQuery({
    queryKey: ["admin-all-orgs"],
    queryFn: () =>
      adminApi.get<{ data: OrganizationRead[]; total: number }>("/api/organizations", {
        query: { page: 1, limit: 200 },
      }),
    staleTime: 5 * 60 * 1000,
  });

  const allMasullar = masullarData?.data ?? [];

  const orgMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of orgsData?.data ?? []) m[o.id] = o.name;
    return m;
  }, [orgsData]);

  const orgObjectMap = useMemo(() => {
    const m: Record<string, OrganizationRead> = {};
    for (const o of orgsData?.data ?? []) m[o.id] = o;
    return m;
  }, [orgsData]);

  // ── Filter state ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");

  // ── Dialog state ──────────────────────────────────────────────────────
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMasul, setSelectedMasul] = useState<MasulRead | null>(null);
  const [selectedOrgProfile, setSelectedOrgProfile] = useState<OrganizationRead | null>(null);
  const [isOrgProfileOpen, setIsOrgProfileOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<MasulRead | null>(null);
  const [passwordMasul, setPasswordMasul] = useState<MasulRead | null>(null);
  const [addDistrict, setAddDistrict] = useState(
    isTashkilotDirektor && currentUser?.districtId ? currentUser.districtId : ""
  );
  const [addOrgId, setAddOrgId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // District-filtered orgs for add form
  const addFormOrgs = useMemo(
    () => (orgsData?.data ?? []).filter((o) => !addDistrict || o.districtId === addDistrict),
    [orgsData, addDistrict]
  );

  // Edit form orgs: filtered by the selected masul's district
  const editFormOrgs = useMemo(
    () => (orgsData?.data ?? []).filter((o) => !selectedMasul || o.districtId === selectedMasul.districtId),
    [orgsData, selectedMasul]
  );

  // ── Filtered list ─────────────────────────────────────────────────────
  const filteredMasullar = allMasullar.filter((m) => {
    if (isTashkilotDirektor && currentUser?.districtId) {
      if (m.districtId !== currentUser.districtId) return false;
    }
    if (districtFilter !== "all" && m.districtId !== districtFilter) return false;
    const q = searchQuery.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.phone ?? "").includes(q)
    );
  });

  const availableDistricts =
    isTashkilotDirektor && currentUser?.districtId
      ? [currentUser.districtId]
      : TOSHKENT_VILOYATI_DISTRICTS;

  // ── CRUD handlers ─────────────────────────────────────────────────────
  const handleAddMasul = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const districtId =
      isTashkilotDirektor && currentUser?.districtId ? currentUser.districtId : addDistrict;
    if (!districtId) return;
    try {
      setIsSubmitting(true);
      await adminApi.post("/api/masullar", {
        fullName: fd.get("fullName") as string,
        email: fd.get("email") as string,
        password: fd.get("password") as string,
        phone: (fd.get("phone") as string) || null,
        districtId,
        organizationId: addOrgId || null,
        position: (fd.get("position") as string) || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-masullar"] });
      handleAddDialogOpenChange(false);
      addToast({ title: "Mas'ul qo'shildi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Mas'ul qo'shishda xato yuz berdi", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDialogOpenChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (open) {
      setAddDistrict(
        isTashkilotDirektor && currentUser?.districtId ? currentUser.districtId : ""
      );
      setAddOrgId("");
    }
  };

  const handleEditMasul = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMasul) return;
    const fd = new FormData(e.currentTarget);
    try {
      setIsSubmitting(true);
      await adminApi.patch(`/api/masullar/${selectedMasul.id}`, {
        fullName: fd.get("fullName") as string,
        email: fd.get("email") as string,
        phone: (fd.get("phone") as string) || null,
        organizationId: (fd.get("organizationId") as string) || null,
        position: (fd.get("position") as string) || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-masullar"] });
      setIsEditDialogOpen(false);
      setSelectedMasul(null);
      addToast({ title: "Mas'ul tahrirlandi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Tahrirlashda xato yuz berdi", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!passwordMasul) return;
    const fd = new FormData(e.currentTarget);
    try {
      setIsSubmitting(true);
      await adminApi.patch(`/api/masullar/${passwordMasul.id}/password`, {
        newPassword: fd.get("newPassword") as string,
      });
      setPasswordMasul(null);
      addToast({ title: "Parol yangilandi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Parolni yangilashda xato yuz berdi", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteMasul = async () => {
    if (!deleteCandidate) return;
    try {
      await adminApi.delete(`/api/masullar/${deleteCandidate.id}`);
      await queryClient.invalidateQueries({ queryKey: ["admin-masullar"] });
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
          <h1 className="text-2xl font-bold text-foreground">Mas'ul hodimlar</h1>
          <p className="text-muted-foreground">
            Yoshlar bilan ishlaydigan mas'ul hodimlarni boshqarish
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Mas'ul qo'shish
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami mas'ullar
            </CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredMasullar.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tumanlar
            </CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredMasullar.map((m) => m.districtId)).size}
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
                placeholder="Ism, email yoki telefon bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {!isTashkilotDirektor && (
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Tuman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha tumanlar</SelectItem>
                  {availableDistricts.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mas'ul hodim</TableHead>
                <TableHead>Tuman</TableHead>
                <TableHead>Tashkilot</TableHead>
                <TableHead>Lavozim</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredMasullar.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Mas'ul hodimlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filteredMasullar.map((masul) => (
                  <TableRow key={masul.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                          <UserCheck className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">{masul.fullName}</p>
                          <p className="text-sm text-muted-foreground">{masul.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {masul.districtId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {masul.organizationId ? (
                        <button
                          className="text-sm text-primary underline decoration-dotted hover:decoration-solid hover:text-primary/80 transition-colors cursor-pointer text-left"
                          onClick={() => {
                            const org = orgObjectMap[masul.organizationId!];
                            if (org) { setSelectedOrgProfile(org); setIsOrgProfileOpen(true); }
                          }}
                        >
                          {orgMap[masul.organizationId] ?? masul.organizationId.slice(0, 8) + "..."}
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{masul.position ?? "—"}</span>
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => { setSelectedMasul(masul); setIsViewDialogOpen(true); }}>
                            <Eye className="mr-2 h-4 w-4" />Ko'rish
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem onClick={() => { setSelectedMasul(masul); setIsEditDialogOpen(true); }}>
                              <Edit className="mr-2 h-4 w-4" />Tahrirlash
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => setPasswordMasul(masul)}>
                              <KeyRound className="mr-2 h-4 w-4" />Parolni o'zgartirish
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCandidate(masul)}>
                              <Trash2 className="mr-2 h-4 w-4" />O'chirish
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

          {/* Mobile card list */}
          <div className="md:hidden">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMasullar.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Mas'ul hodimlar topilmadi</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredMasullar.map((masul) => (
                  <div key={masul.id} className="p-4">
                    {/* Row 1: avatar + name + district */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 shrink-0">
                          <UserCheck className="h-5 w-5 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{masul.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{masul.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="gap-1 shrink-0 text-xs">
                        <MapPin className="h-3 w-3" />
                        {masul.districtId}
                      </Badge>
                    </div>
                    {/* Row 2: org + position */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 pl-[52px] text-sm text-muted-foreground">
                      {masul.organizationId && (
                        <button
                          className="text-xs text-primary underline decoration-dotted hover:decoration-solid cursor-pointer truncate max-w-[180px]"
                          onClick={() => {
                            const org = orgObjectMap[masul.organizationId!];
                            if (org) { setSelectedOrgProfile(org); setIsOrgProfileOpen(true); }
                          }}
                        >
                          {orgMap[masul.organizationId] ?? masul.organizationId.slice(0, 8) + "..."}
                        </button>
                      )}
                      {masul.position && <span className="text-xs">{masul.position}</span>}
                    </div>
                    {/* Row 3: action button */}
                    <div className="flex items-center gap-2 pl-[52px]">
                      <Button size="sm" variant="outline" className="h-8 text-xs bg-transparent"
                        onClick={() => { setSelectedMasul(masul); setIsViewDialogOpen(true); }}>
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

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yangi mas'ul hodim qo'shish</DialogTitle>
            <DialogDescription>Mas'ul hodim ma'lumotlarini kiriting</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMasul}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">To'liq ism *</Label>
                <Input id="fullName" name="fullName" required placeholder="F.I.O." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required placeholder="email@example.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" placeholder="+998 XX XXX XX XX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">Parol *</Label>
                  <Input id="password" name="password" type="password" required minLength={6} placeholder="Kamida 6 belgi" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Lavozim</Label>
                  <Input id="position-top" name="position" placeholder="Mas'ul hodim lavozimi" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {!isTashkilotDirektor && (
                  <div className="grid gap-2">
                    <Label>Tuman *</Label>
                    <Select
                      value={addDistrict}
                      onValueChange={(v) => {
                        setAddDistrict(v);
                        setAddOrgId("");
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tumanni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {TOSHKENT_VILOYATI_DISTRICTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Tashkilot</Label>
                  <Select
                    value={addOrgId}
                    onValueChange={setAddOrgId}
                    disabled={!addDistrict}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={addDistrict ? "Tashkilotni tanlang" : "Avval tuman"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {addFormOrgs.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleAddDialogOpenChange(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Qo'shish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mas'ul hodim ma'lumotlari</DialogTitle>
          </DialogHeader>
          {selectedMasul && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <UserCheck className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedMasul.fullName}</h3>
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedMasul.districtId}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  { icon: Mail, label: "Email", val: selectedMasul.email },
                  { icon: Phone, label: "Telefon", val: selectedMasul.phone ?? "—" },
                  {
                    icon: null,
                    label: "Tashkilot",
                    val: selectedMasul.organizationId
                      ? (orgMap[selectedMasul.organizationId] ?? "—")
                      : "—",
                  },
                  { icon: null, label: "Lavozim", val: selectedMasul.position ?? "—" },
                  { icon: null, label: "Qo'shilgan sana", val: selectedMasul.createdAt.slice(0, 10) },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="flex items-center gap-2 py-2 border-b last:border-0">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-medium ml-auto">{val}</span>
                  </div>
                ))}
              </div>
              {(canEdit || isAdmin) && (
                <div className="md:hidden flex flex-wrap gap-2 pt-2">
                  {canEdit && (
                    <Button className="flex-1" onClick={() => { setIsViewDialogOpen(false); setIsEditDialogOpen(true); }}>
                      <Edit className="mr-2 h-4 w-4" />Tahrirlash
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="outline" onClick={() => { setIsViewDialogOpen(false); setPasswordMasul(selectedMasul); }}>
                      <KeyRound className="mr-2 h-4 w-4" />Parol
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => { setIsViewDialogOpen(false); setDeleteCandidate(selectedMasul); }}>
                      <Trash2 className="mr-2 h-4 w-4" />O'chirish
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mas'ul hodimni tahrirlash</DialogTitle>
          </DialogHeader>
          {selectedMasul && (
            <form onSubmit={handleEditMasul}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-fullName">To'liq ism</Label>
                  <Input id="edit-fullName" name="fullName" required defaultValue={selectedMasul.fullName} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input id="edit-email" name="email" type="email" defaultValue={selectedMasul.email} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone">Telefon</Label>
                    <Input id="edit-phone" name="phone" defaultValue={selectedMasul.phone ?? ""} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Tuman</Label>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {selectedMasul.districtId}
                    <Badge variant="secondary" className="ml-auto text-xs">O'zgartirib bo'lmaydi</Badge>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-org">Tashkilot</Label>
                  <Select name="organizationId" defaultValue={selectedMasul.organizationId ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tashkilotni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {editFormOrgs.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-position">Lavozim</Label>
                  <Input id="edit-position" name="position" defaultValue={selectedMasul.position ?? ""} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Saqlash
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={Boolean(passwordMasul)} onOpenChange={(open) => !open && setPasswordMasul(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Parolni o'zgartirish</DialogTitle>
            <DialogDescription>
              {passwordMasul?.fullName} uchun yangi parol o'rnating
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">Yangi parol *</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Kamida 6 belgi"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordMasul(null)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteCandidate)}
        title="Mas'ul hodimni o'chirish"
        description={
          deleteCandidate
            ? `"${deleteCandidate.fullName}" mas'ul hodimni o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.`
            : undefined
        }
        onConfirm={confirmDeleteMasul}
        onCancel={() => setDeleteCandidate(null)}
      />

      {/* Organization Profile Dialog */}
      <Dialog open={isOrgProfileOpen} onOpenChange={setIsOrgProfileOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Tashkilot ma'lumotlari</DialogTitle>
          </DialogHeader>
          {selectedOrgProfile && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-tight">{selectedOrgProfile.name}</h3>
                  {selectedOrgProfile.type && (
                    <p className="text-sm text-muted-foreground">{selectedOrgProfile.type}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-0 divide-y">
                {[
                  { label: "Tuman", val: selectedOrgProfile.districtId },
                  { label: "Rahbar", val: selectedOrgProfile.headName ?? "—" },
                  { label: "Telefon", val: selectedOrgProfile.contactPhone ?? "—" },
                  { label: "Manzil", val: selectedOrgProfile.address ?? "—" },
                  {
                    label: "Qo'shilgan sana",
                    val: new Date(selectedOrgProfile.createdAt).toLocaleDateString("uz-UZ"),
                  },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between py-2.5">
                    <span className="text-muted-foreground text-sm">{label}</span>
                    <span className="font-medium text-sm text-right max-w-[55%]">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
