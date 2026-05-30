"use client";

import React from "react";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { youthCategories } from "@/lib/mock-data";
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
    setCurrentPage,
  } = useApp();

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isMasul = currentUser?.role === "masul_hodim";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const canEdit = isAdmin || isDirektor || isTashkilotDirektor;
  const canAssign = isAdmin || isTashkilotDirektor;

  const visibleYouth = getVisibleYouth();
  const visibleMasullar = getVisibleMasullar();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
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
  const [newYouthDistrict, setNewYouthDistrict] = useState<ToshkentDistrict | "">(
    currentUser?.districtId || ""
  );

  // Apply filters
  const filteredYouth = visibleYouth.filter((y) => {
    const matchesSearch =
      y.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      y.phone.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || y.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || y.category === categoryFilter;
    const matchesDistrict = districtFilter === "all" || y.districtId === districtFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesDistrict;
  });

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
      category: formData.get("category") as string,
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
      category: formData.get("category") as string,
    });

    setIsLoading(false);
    setIsEditDialogOpen(false);
    setSelectedYouth(null);
  };

  const handleAssignYouth = async () => {
    if (!selectedYouth || !selectedMasulId) return;
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 500));

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
    removeYouth(selectedYouth.id, removeReason);

    setIsLoading(false);
    setIsRemoveDialogOpen(false);
    setSelectedYouth(null);
    setRemoveReason("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-accent text-accent-foreground">Faol</Badge>;
      case "inactive":
        return <Badge variant="secondary">Nofaol</Badge>;
      case "graduated":
        return <Badge className="bg-chart-1 text-primary-foreground">Yakunlangan</Badge>;
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
                <SelectItem value="inactive">Nofaol</SelectItem>
                <SelectItem value="graduated">Yakunlangan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Kategoriya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha kategoriyalar</SelectItem>
                {youthCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-transparent">
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
                <TableHead>Kategoriya</TableHead>
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
                      <Badge variant="outline">{youth.category}</Badge>
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
                <Label>Tuman *</Label>
                {isTashkilotDirektor && currentUser?.districtId ? (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
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
              <div className="grid gap-2">
                <Label htmlFor="address">Manzil *</Label>
                <Input id="address" name="address" required placeholder="To'liq manzil" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Kategoriya *</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategoriyani tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {youthCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <TabsTrigger value="plans">Rejalar ({selectedYouth.plansCount})</TabsTrigger>
                <TabsTrigger value="meetings">
                  Uchrashuvlar ({selectedYouth.meetingsCount})
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
                      <span className="text-sm text-muted-foreground">Kategoriya</span>
                      <p className="font-medium">{selectedYouth.category}</p>
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
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  {selectedYouth.plansCount > 0 ? (
                    <p>
                      {selectedYouth.plansCount} ta reja mavjud. Rejalar sahifasida ko'ring.
                    </p>
                  ) : (
                    <p>Hozircha rejalar yo'q</p>
                  )}
                  <Button
                    variant="outline"
                    className="mt-4 bg-transparent"
                    onClick={() => setCurrentPage("rejalar")}
                  >
                    Rejalarga o'tish
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="meetings" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  {selectedYouth.meetingsCount > 0 ? (
                    <p>
                      {selectedYouth.meetingsCount} ta uchrashuv mavjud. Uchrashuvlar sahifasida
                      ko'ring.
                    </p>
                  ) : (
                    <p>Hozircha uchrashuvlar yo'q</p>
                  )}
                  <Button
                    variant="outline"
                    className="mt-4 bg-transparent"
                    onClick={() => setCurrentPage("uchrashuvlar")}
                  >
                    Uchrashuvlarga o'tish
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
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedYouth.districtId}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      O'zgartirib bo'lmaydi
                    </Badge>
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
                  <Label htmlFor="edit-category">Kategoriya</Label>
                  <Select name="category" defaultValue={selectedYouth.category}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {youthCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    {getAvailableMasullar(selectedYouth).length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Bu tumanda mas'ul hodim yo'q
                      </div>
                    ) : (
                      getAvailableMasullar(selectedYouth).map((masul) => (
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
