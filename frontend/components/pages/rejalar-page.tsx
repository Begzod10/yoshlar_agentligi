"use client";

import React from "react"

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import type { IndividualPlan } from "@/lib/types";
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
  Edit,
  Trash2,
  Download,
  FileText,
  CheckCircle,
  Clock,
  Calendar,
  PlayCircle,
  XCircle,
  MapPin,
} from "lucide-react";

export function RejalarPage() {
  const {
    currentUser,
    plans,
    youth,
    masullar,
    addPlan,
    updatePlan,
    deletePlan,
    selectedDistrict,
    showToast,
  } = useApp();

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isMasul = currentUser?.role === "masul_hodim";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const canAdd = isAdmin || isDirektor || isTashkilotDirektor || isMasul;
  const canEdit = isAdmin || isDirektor || isTashkilotDirektor || isMasul;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<IndividualPlan | null>(null);

  // Get youth for district
  const filteredYouth = youth.filter((y) => {
    if (isMasul) return y.assignedMasulId === currentUser?.id;
    if (isTashkilotDirektor && currentUser?.districtId) {
      return y.districtId === currentUser.districtId;
    }
    if (selectedDistrict) return y.districtId === selectedDistrict;
    return true;
  });

  const youthIds = filteredYouth.map((y) => y.id);

  // Filter plans based on role and selection
  let filteredPlans = plans.filter((p) => {
    // Role-based filtering
    if (isMasul) {
      if (p.masulId !== currentUser?.id) return false;
    } else if (isTashkilotDirektor && currentUser?.districtId) {
      if (!youthIds.includes(p.youthId)) return false;
    } else if (selectedDistrict) {
      if (!youthIds.includes(p.youthId)) return false;
    }

    // Status filter
    if (statusFilter !== "all" && p.status !== statusFilter) return false;

    // Search filter
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.youthName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Statistics
  const totalPlans = filteredPlans.length;
  const completedPlans = filteredPlans.filter((p) => p.status === "completed").length;
  const inProgressPlans = filteredPlans.filter((p) => p.status === "in_progress").length;
  const pendingPlans = filteredPlans.filter((p) => p.status === "pending").length;
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
      case "pending":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <Clock className="mr-1 h-3 w-3" />
            Kutilmoqda
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

  const handleAddPlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const youthId = formData.get("youthId") as string;
    const selectedYouth = youth.find((y) => y.id === youthId);

    const masulId = isMasul
      ? currentUser?.id || ""
      : (formData.get("masulId") as string);
    const selectedMasul = masullar.find((m) => m.id === masulId);

    const newPlan: Omit<IndividualPlan, "id" | "createdAt"> = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      youthId,
      youthName: selectedYouth?.fullName || "",
      masulId,
      masulName: selectedMasul?.fullName || "",
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      status: "pending",
      progress: 0,
      tasks: [],
    };

    addPlan(newPlan);
    setIsAddDialogOpen(false);
    showToast("Reja muvaffaqiyatli qo'shildi", "success");
  };

  const handleUpdateStatus = (plan: IndividualPlan, newStatus: IndividualPlan["status"]) => {
    const progress = newStatus === "completed" ? 100 : newStatus === "in_progress" ? 50 : 0;
    updatePlan(plan.id, { status: newStatus, progress });
    showToast("Reja holati yangilandi", "success");
  };

  const handleDeletePlan = (plan: IndividualPlan) => {
    if (confirm(`"${plan.title}" rejasini o'chirishni tasdiqlaysizmi?`)) {
      deletePlan(plan.id);
      showToast("Reja o'chirildi", "success");
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
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Reja qo'shish
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami rejalar
            </CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bajarilgan
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{completedPlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jarayonda
            </CardTitle>
            <PlayCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{inProgressPlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bajarish darajasi
            </CardTitle>
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
                <SelectItem value="pending">Kutilmoqda</SelectItem>
                <SelectItem value="in_progress">Jarayonda</SelectItem>
                <SelectItem value="completed">Bajarilgan</SelectItem>
                <SelectItem value="cancelled">Bekor qilingan</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
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
                <TableHead>Mas'ul</TableHead>
                <TableHead>Muddat</TableHead>
                <TableHead className="text-center">Progress</TableHead>
                <TableHead className="text-center">Holat</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Rejalar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{plan.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {plan.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{plan.youthName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{plan.masulName}</span>
                    </TableCell>
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
                              <DropdownMenuItem onClick={() => handleUpdateStatus(plan, "in_progress")}>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Jarayonga o'tkazish
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(plan, "completed")}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Bajarildi
                              </DropdownMenuItem>
                            </>
                          )}
                          {isAdmin && (
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yangi reja qo'shish</DialogTitle>
            <DialogDescription>
              Individual ishlash rejasini yarating
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPlan}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Reja nomi</Label>
                <Input id="title" name="title" required placeholder="Reja nomini kiriting" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Tavsif</Label>
                <Textarea id="description" name="description" placeholder="Reja haqida qisqacha ma'lumot" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="youthId">Yosh</Label>
                <Select name="youthId" required>
                  <SelectTrigger>
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
                  <Label htmlFor="masulId">Mas'ul hodim</Label>
                  <Select name="masulId" required>
                    <SelectTrigger>
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
                  <Label htmlFor="startDate">Boshlanish sanasi</Label>
                  <Input id="startDate" name="startDate" type="date" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">Tugash sanasi</Label>
                  <Input id="endDate" name="endDate" type="date" required />
                </div>
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
    </div>
  );
}
