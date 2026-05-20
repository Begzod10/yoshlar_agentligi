"use client";

import React from "react"

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import type { Masul, ToshkentDistrict } from "@/lib/types";
import { TOSHKENT_VILOYATI_DISTRICTS } from "@/lib/types";
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
  UserCheck,
  Users,
  Award,
  FileText,
  Calendar,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

export function MasullarPage() {
  const {
    currentUser,
    masullar,
    organizations,
    addMasul,
    updateMasul,
    deleteMasul,
    selectedDistrict,
    showToast,
  } = useApp();

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const canAdd = isAdmin || isDirektor || isTashkilotDirektor;
  const canEdit = isAdmin || isDirektor || isTashkilotDirektor;

  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMasul, setSelectedMasul] = useState<Masul | null>(null);

  // Filter masullar based on role and selection
  let filteredMasullar = masullar.filter((m) => {
    // Role-based filtering
    if (isTashkilotDirektor && currentUser?.districtId) {
      if (m.districtId !== currentUser.districtId) return false;
    }

    // Global district filter
    if (selectedDistrict && m.districtId !== selectedDistrict) return false;

    // Local filters
    if (districtFilter !== "all" && m.districtId !== districtFilter) return false;
    if (orgFilter !== "all" && m.organizationId !== orgFilter) return false;

    // Search filter
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery);

    return matchesSearch;
  });

  // Get available districts and organizations for filters
  const availableDistricts = isTashkilotDirektor && currentUser?.districtId
    ? [currentUser.districtId]
    : TOSHKENT_VILOYATI_DISTRICTS;

  const availableOrganizations = isTashkilotDirektor && currentUser?.districtId
    ? organizations.filter((o) => o.districtId === currentUser.districtId)
    : organizations;

  // Statistics
  const totalMasullar = filteredMasullar.length;
  const totalAssignedYouth = filteredMasullar.reduce((sum, m) => sum + m.assignedYouthCount, 0);
  const averageAiScore = filteredMasullar.length > 0
    ? Math.round(filteredMasullar.reduce((sum, m) => sum + m.aiScore, 0) / filteredMasullar.length)
    : 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-accent";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const handleAddMasul = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const districtId = isTashkilotDirektor && currentUser?.districtId
      ? currentUser.districtId
      : (formData.get("districtId") as ToshkentDistrict);

    const orgId = formData.get("organizationId") as string;
    const org = organizations.find((o) => o.id === orgId);

    const newMasul: Omit<Masul, "id" | "createdAt"> = {
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      districtId,
      organizationId: orgId,
      organizationName: org?.name || "",
      assignedYouthCount: 0,
      completedPlansCount: 0,
      meetingsCount: 0,
      aiScore: 50,
    };

    addMasul(newMasul);
    setIsAddDialogOpen(false);
    showToast("Mas'ul hodim muvaffaqiyatli qo'shildi", "success");
  };

  const handleEditMasul = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMasul) return;

    const formData = new FormData(e.currentTarget);
    const districtId = isTashkilotDirektor && currentUser?.districtId
      ? currentUser.districtId
      : (formData.get("districtId") as ToshkentDistrict);

    const orgId = formData.get("organizationId") as string;
    const org = organizations.find((o) => o.id === orgId);

    updateMasul(selectedMasul.id, {
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      districtId,
      organizationId: orgId,
      organizationName: org?.name || "",
    });

    setIsEditDialogOpen(false);
    setSelectedMasul(null);
    showToast("Mas'ul hodim muvaffaqiyatli tahrirlandi", "success");
  };

  const handleDeleteMasul = (masul: Masul) => {
    if (confirm(`"${masul.fullName}" mas'ul hodimni o'chirishni tasdiqlaysizmi?`)) {
      deleteMasul(masul.id);
      showToast("Mas'ul hodim o'chirildi", "success");
    }
  };

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

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami mas'ullar
            </CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMasullar}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Biriktirilgan yoshlar
            </CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssignedYouth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              O'rtacha AI ball
            </CardTitle>
            <Award className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(averageAiScore)}`}>
              {averageAiScore}%
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
                  {availableDistricts.map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Tashkilot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha tashkilotlar</SelectItem>
                {availableOrganizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Masullar Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mas'ul hodim</TableHead>
                <TableHead>Tuman</TableHead>
                <TableHead>Tashkilot</TableHead>
                <TableHead className="text-center">Yoshlar</TableHead>
                <TableHead className="text-center">AI ball</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMasullar.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                      <span className="text-sm">{masul.organizationName}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{masul.assignedYouthCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Progress value={masul.aiScore} className="w-16 h-2" />
                        <span className={`text-sm font-medium ${getScoreColor(masul.aiScore)}`}>
                          {masul.aiScore}%
                        </span>
                      </div>
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
                              setSelectedMasul(masul);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ko'rish
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMasul(masul);
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
                              onClick={() => handleDeleteMasul(masul)}
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

      {/* Add Masul Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yangi mas'ul hodim qo'shish</DialogTitle>
            <DialogDescription>
              Mas'ul hodim ma'lumotlarini kiriting
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMasul}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">To'liq ism</Label>
                <Input id="fullName" name="fullName" required placeholder="F.I.O." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="email@example.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" required placeholder="+998 XX XXX XX XX" />
                </div>
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
                <Label htmlFor="organizationId">Tashkilot</Label>
                <Select name="organizationId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Tashkilotni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrganizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* View Masul Dialog */}
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
                <div className="flex items-center gap-2 py-2 border-b">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium ml-auto">{selectedMasul.email}</span>
                </div>
                <div className="flex items-center gap-2 py-2 border-b">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Telefon:</span>
                  <span className="font-medium ml-auto">{selectedMasul.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tashkilot</span>
                  <span className="font-medium">{selectedMasul.organizationName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Biriktirilgan yoshlar</span>
                  <Badge>{selectedMasul.assignedYouthCount}</Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Bajarilgan rejalar</span>
                  <Badge variant="secondary">{selectedMasul.completedPlansCount}</Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">O'tkazilgan uchrashuvlar</span>
                  <Badge variant="secondary">{selectedMasul.meetingsCount}</Badge>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">AI samaradorlik balli</span>
                  <span className={`font-bold ${getScoreColor(selectedMasul.aiScore)}`}>
                    {selectedMasul.aiScore}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Masul Dialog */}
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
                  <Input
                    id="edit-fullName"
                    name="fullName"
                    required
                    defaultValue={selectedMasul.fullName}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      name="email"
                      type="email"
                      required
                      defaultValue={selectedMasul.email}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone">Telefon</Label>
                    <Input
                      id="edit-phone"
                      name="phone"
                      required
                      defaultValue={selectedMasul.phone}
                    />
                  </div>
                </div>
                {!isTashkilotDirektor && (
                  <div className="grid gap-2">
                    <Label htmlFor="edit-districtId">Tuman</Label>
                    <Select name="districtId" defaultValue={selectedMasul.districtId}>
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
                  <Label htmlFor="edit-organizationId">Tashkilot</Label>
                  <Select name="organizationId" defaultValue={selectedMasul.organizationId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOrganizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
