"use client";

import React from "react"

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import type { Organization, ToshkentDistrict } from "@/lib/types";
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
  Download,
  Building2,
  Users,
  UserCheck,
  MapPin,
} from "lucide-react";

export function TashkilotlarPage() {
  const {
    currentUser,
    organizations,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    selectedDistrict,
    canViewDistrict,
    showToast,
  } = useApp();

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const canAdd = isAdmin || isDirektor;
  const canEdit = isAdmin || isDirektor || isTashkilotDirektor;

  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Filter organizations based on role and selection
  let filteredOrganizations = organizations.filter((org) => {
    // Role-based filtering
    if (isTashkilotDirektor && currentUser?.districtId) {
      if (org.districtId !== currentUser.districtId) return false;
    }

    // Global district filter
    if (selectedDistrict && org.districtId !== selectedDistrict) return false;

    // Local district filter
    if (districtFilter !== "all" && org.districtId !== districtFilter) return false;

    // Search filter
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.directorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.address.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Get available districts for filter
  const availableDistricts = isTashkilotDirektor && currentUser?.districtId
    ? [currentUser.districtId]
    : TOSHKENT_VILOYATI_DISTRICTS;

  // Statistics
  const totalOrganizations = filteredOrganizations.length;
  const totalMasullar = filteredOrganizations.reduce((sum, org) => sum + org.masullarCount, 0);
  const totalYoshlar = filteredOrganizations.reduce((sum, org) => sum + org.yoshlarCount, 0);

  const handleAddOrganization = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const districtId = isTashkilotDirektor && currentUser?.districtId
      ? currentUser.districtId
      : (formData.get("districtId") as ToshkentDistrict);

    const newOrg: Omit<Organization, "id" | "createdAt"> = {
      name: formData.get("name") as string,
      districtId,
      address: formData.get("address") as string,
      directorId: "",
      directorName: formData.get("directorName") as string,
      masullarCount: 0,
      yoshlarCount: 0,
    };

    addOrganization(newOrg);
    setIsAddDialogOpen(false);
    showToast("Tashkilot muvaffaqiyatli qo'shildi", "success");
  };

  const handleEditOrganization = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrg) return;

    const formData = new FormData(e.currentTarget);
    const districtId = isTashkilotDirektor && currentUser?.districtId
      ? currentUser.districtId
      : (formData.get("districtId") as ToshkentDistrict);

    updateOrganization(selectedOrg.id, {
      name: formData.get("name") as string,
      districtId,
      address: formData.get("address") as string,
      directorName: formData.get("directorName") as string,
    });

    setIsEditDialogOpen(false);
    setSelectedOrg(null);
    showToast("Tashkilot muvaffaqiyatli tahrirlandi", "success");
  };

  const handleDeleteOrganization = (org: Organization) => {
    if (confirm(`"${org.name}" tashkilotini o'chirishni tasdiqlaysizmi?`)) {
      deleteOrganization(org.id);
      showToast("Tashkilot o'chirildi", "success");
    }
  };

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

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami tashkilotlar
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrganizations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami mas'ullar
            </CardTitle>
            <UserCheck className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMasullar}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami yoshlar
            </CardTitle>
            <Users className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalYoshlar}</div>
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
                placeholder="Tashkilot nomi yoki direktor bo'yicha qidirish..."
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
                  {availableDistricts.map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tashkilot nomi</TableHead>
                <TableHead>Tuman</TableHead>
                <TableHead>Direktor</TableHead>
                <TableHead className="text-center">Mas'ullar</TableHead>
                <TableHead className="text-center">Yoshlar</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Tashkilotlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrganizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">{org.address}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {org.districtId}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.directorName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{org.masullarCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{org.yoshlarCount}</Badge>
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
                              onClick={() => handleDeleteOrganization(org)}
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
        </CardContent>
      </Card>

      {/* Add Organization Dialog */}
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
                <Label htmlFor="name">Tashkilot nomi</Label>
                <Input id="name" name="name" required placeholder="Tashkilot nomini kiriting" />
              </div>
              {!isTashkilotDirektor && (
                <div className="grid gap-2">
                  <Label htmlFor="districtId">Tuman</Label>
                  <Select name="districtId" required>
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
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="address">Manzil</Label>
                <Textarea id="address" name="address" required placeholder="To'liq manzilni kiriting" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="directorName">Direktor</Label>
                <Input id="directorName" name="directorName" required placeholder="Direktor F.I.O." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit">Qo'shish</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Organization Dialog */}
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
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Direktor</span>
                  <span className="font-medium">{selectedOrg.directorName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Manzil</span>
                  <span className="font-medium text-right max-w-[200px]">{selectedOrg.address}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Mas'ullar soni</span>
                  <Badge>{selectedOrg.masullarCount}</Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Yoshlar soni</span>
                  <Badge>{selectedOrg.yoshlarCount}</Badge>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Qo'shilgan sana</span>
                  <span className="font-medium">{selectedOrg.createdAt}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
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
                  <Input
                    id="edit-name"
                    name="name"
                    required
                    defaultValue={selectedOrg.name}
                  />
                </div>
                {!isTashkilotDirektor && (
                  <div className="grid gap-2">
                    <Label htmlFor="edit-districtId">Tuman</Label>
                    <Select name="districtId" defaultValue={selectedOrg.districtId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOSHKENT_VILOYATI_DISTRICTS.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="edit-address">Manzil</Label>
                  <Textarea
                    id="edit-address"
                    name="address"
                    required
                    defaultValue={selectedOrg.address}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-directorName">Direktor</Label>
                  <Input
                    id="edit-directorName"
                    name="directorName"
                    required
                    defaultValue={selectedOrg.directorName}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit">Saqlash</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
