"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-context";
import { adminApi } from "@/lib/api/client";
import type { OrganizationRead } from "@/lib/api/types";
import { TOSHKENT_VILOYATI_DISTRICTS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
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
  Edit,
  Trash2,
  Building2,
  MapPin,
  Loader2,
} from "lucide-react";

export function AdminTashkilotlarPage() {
  const { currentUser, addToast } = useApp();
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const canAdd = isAdmin || isDirektor;
  const canEdit = isAdmin || isDirektor || isTashkilotDirektor;

  // ── Data ──────────────────────────────────────────────────────────────
  const { data: orgsData, isLoading } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: () =>
      adminApi.get<{ data: OrganizationRead[]; total: number }>("/api/organizations", {
        query: { page: 1, limit: 50 },
      }),
  });

  const allOrgs = orgsData?.data ?? [];

  // ── Filter state ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");

  // ── Dialog state ──────────────────────────────────────────────────────
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationRead | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<OrganizationRead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Filtered list ─────────────────────────────────────────────────────
  const filteredOrgs = allOrgs.filter((o) => {
    if (isTashkilotDirektor && currentUser?.districtId) {
      if (o.districtId !== currentUser.districtId) return false;
    }
    if (districtFilter !== "all" && o.districtId !== districtFilter) return false;
    const q = searchQuery.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.headName ?? "").toLowerCase().includes(q) ||
      (o.address ?? "").toLowerCase().includes(q)
    );
  });

  const availableDistricts =
    isTashkilotDirektor && currentUser?.districtId
      ? [currentUser.districtId]
      : TOSHKENT_VILOYATI_DISTRICTS;

  // ── CRUD handlers ─────────────────────────────────────────────────────
  const handleAddOrganization = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const districtId =
      isTashkilotDirektor && currentUser?.districtId
        ? currentUser.districtId
        : (fd.get("districtId") as string);
    if (!districtId) return;
    try {
      setIsSubmitting(true);
      await adminApi.post("/api/organizations", {
        name: fd.get("name") as string,
        districtId,
        address: (fd.get("address") as string) || null,
        headName: (fd.get("headName") as string) || null,
        type: (fd.get("type") as string) || null,
        contactPhone: (fd.get("contactPhone") as string) || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setIsAddDialogOpen(false);
      addToast({ title: "Tashkilot qo'shildi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Tashkilot qo'shishda xato yuz berdi", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOrganization = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrg) return;
    const fd = new FormData(e.currentTarget);
    try {
      setIsSubmitting(true);
      await adminApi.patch(`/api/organizations/${selectedOrg.id}`, {
        name: fd.get("name") as string,
        address: (fd.get("address") as string) || null,
        headName: (fd.get("headName") as string) || null,
        type: (fd.get("type") as string) || null,
        contactPhone: (fd.get("contactPhone") as string) || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setIsEditDialogOpen(false);
      setSelectedOrg(null);
      addToast({ title: "Tashkilot tahrirlandi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Tahrirlashda xato yuz berdi", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!deleteCandidate) return;
    try {
      await adminApi.delete(`/api/organizations/${deleteCandidate.id}`);
      await queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
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
          <h1 className="text-2xl font-bold text-foreground">Tashkilotlar</h1>
          <p className="text-muted-foreground">
            Toshkent viloyati tashkilotlarini boshqarish
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tashkilot qo'shish
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami tashkilotlar
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredOrgs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tumanlar
            </CardTitle>
            <MapPin className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredOrgs.map((o) => o.districtId)).size}
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
                placeholder="Tashkilot nomi yoki direktor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {!isTashkilotDirektor && (
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
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
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tashkilot nomi</TableHead>
                <TableHead>Tuman</TableHead>
                <TableHead>Direktor</TableHead>
                <TableHead>Turi</TableHead>
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
              ) : filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Tashkilotlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {org.address ?? "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {org.districtId}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.headName ?? "—"}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{org.type ?? "—"}</span>
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
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedOrg(org);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ko'rish
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOrg(org);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Tahrirlash
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteCandidate(org)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              O'chirish
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

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yangi tashkilot qo'shish</DialogTitle>
            <DialogDescription>
              Toshkent viloyati uchun yangi tashkilot ma'lumotlarini kiriting
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddOrganization}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tashkilot nomi *</Label>
                <Input id="name" name="name" required placeholder="Tashkilot nomini kiriting" />
              </div>
              {!isTashkilotDirektor && (
                <div className="grid gap-2">
                  <Label htmlFor="districtId">Tuman *</Label>
                  <Select name="districtId" required>
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
                <Label htmlFor="headName">Direktor</Label>
                <Input id="headName" name="headName" placeholder="Direktor F.I.O." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Manzil</Label>
                <Textarea id="address" name="address" placeholder="To'liq manzilni kiriting" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Turi</Label>
                  <Input id="type" name="type" placeholder="Tashkilot turi" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactPhone">Telefon</Label>
                  <Input id="contactPhone" name="contactPhone" placeholder="+998 XX XXX XX XX" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
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
            <DialogTitle>Tashkilot ma'lumotlari</DialogTitle>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedOrg.name}</h3>
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedOrg.districtId}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  { label: "Direktor", val: selectedOrg.headName ?? "—" },
                  { label: "Manzil", val: selectedOrg.address ?? "—" },
                  { label: "Turi", val: selectedOrg.type ?? "—" },
                  { label: "Telefon", val: selectedOrg.contactPhone ?? "—" },
                  { label: "Qo'shilgan sana", val: selectedOrg.createdAt.slice(0, 10) },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right max-w-[240px]">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tashkilotni tahrirlash</DialogTitle>
          </DialogHeader>
          {selectedOrg && (
            <form onSubmit={handleEditOrganization}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Tashkilot nomi</Label>
                  <Input id="edit-name" name="name" required defaultValue={selectedOrg.name} />
                </div>
                <div className="grid gap-2">
                  <Label>Tuman</Label>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {selectedOrg.districtId}
                    <Badge variant="secondary" className="ml-auto text-xs">O'zgartirib bo'lmaydi</Badge>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-headName">Direktor</Label>
                  <Input id="edit-headName" name="headName" defaultValue={selectedOrg.headName ?? ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-address">Manzil</Label>
                  <Textarea id="edit-address" name="address" defaultValue={selectedOrg.address ?? ""} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-type">Turi</Label>
                    <Input id="edit-type" name="type" defaultValue={selectedOrg.type ?? ""} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-contactPhone">Telefon</Label>
                    <Input id="edit-contactPhone" name="contactPhone" defaultValue={selectedOrg.contactPhone ?? ""} />
                  </div>
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

      <ConfirmDeleteDialog
        open={Boolean(deleteCandidate)}
        title="Tashkilotni o'chirish"
        description={
          deleteCandidate
            ? `"${deleteCandidate.name}" tashkilotini o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.`
            : undefined
        }
        onConfirm={handleDeleteOrganization}
        onCancel={() => setDeleteCandidate(null)}
      />
    </div>
  );
}
