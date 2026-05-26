"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  UserMinus,
  CheckCircle,
  Calendar,
  MapPin,
  Eye,
  TrendingUp,
  Award,
} from "lucide-react";

export function ChiqarilganPage() {
  const {
    currentUser,
    youth,
    selectedDistrict,
  } = useApp();

  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";

  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedYouth, setSelectedYouth] = useState<typeof youth[0] | null>(null);

  // Get graduated youth (removed from program)
  const graduatedYouth = youth.filter((y) => y.status === "graduated");

  // Filter based on role and selection
  let filteredYouth = graduatedYouth.filter((y) => {
    // Role-based filtering
    if (isTashkilotDirektor && currentUser?.districtId) {
      if (y.districtId !== currentUser.districtId) return false;
    }

    // Global district filter
    if (selectedDistrict && y.districtId !== selectedDistrict) return false;

    // Local filters
    if (districtFilter !== "all" && y.districtId !== districtFilter) return false;
    if (reasonFilter !== "all" && y.removalReason !== reasonFilter) return false;

    // Search filter
    const matchesSearch =
      y.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      y.address.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Get available districts
  const availableDistricts = isTashkilotDirektor && currentUser?.districtId
    ? [currentUser.districtId]
    : TOSHKENT_VILOYATI_DISTRICTS;

  // Unique removal reasons
  const removalReasons = [...new Set(graduatedYouth.map((y) => y.removalReason).filter(Boolean))];

  // Statistics
  const totalGraduated = filteredYouth.length;
  const byReason = removalReasons.reduce((acc, reason) => {
    if (reason) {
      acc[reason] = filteredYouth.filter((y) => y.removalReason === reason).length;
    }
    return acc;
  }, {} as Record<string, number>);

  const getReasonBadge = (reason?: string) => {
    switch (reason) {
      case "Ijobiy o'zgarish":
        return (
          <Badge className="bg-accent/10 text-accent border-accent/20">
            <TrendingUp className="mr-1 h-3 w-3" />
            Ijobiy o'zgarish
          </Badge>
        );
      case "O'qishga kirdi":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Award className="mr-1 h-3 w-3" />
            O'qishga kirdi
          </Badge>
        );
      case "Ishga joylashdi":
        return (
          <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            Ishga joylashdi
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {reason || "Boshqa sabab"}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chiqarilgan yoshlar</h1>
          <p className="text-muted-foreground">
            Dasturdan muvaffaqiyatli chiqarilgan yoshlar ro'yxati
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Hisobot yuklab olish
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami chiqarilgan
            </CardTitle>
            <UserMinus className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGraduated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ijobiy o'zgarish
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {byReason["Ijobiy o'zgarish"] || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              O'qishga kirgan
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {byReason["O'qishga kirdi"] || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ishga joylashgan
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-3">
              {byReason["Ishga joylashdi"] || 0}
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
                placeholder="Ism yoki manzil bo'yicha qidirish..."
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
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sabab" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha sabablar</SelectItem>
                {removalReasons.map((reason) => (
                  <SelectItem key={reason} value={reason!}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Graduated Youth Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>F.I.O.</TableHead>
                <TableHead>Tuman</TableHead>
                <TableHead>Mas'ul hodim</TableHead>
                <TableHead>Chiqarilgan sana</TableHead>
                <TableHead className="text-center">Sabab</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredYouth.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Chiqarilgan yoshlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filteredYouth.map((y) => (
                  <TableRow key={y.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                          <CheckCircle className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">{y.fullName}</p>
                          <p className="text-sm text-muted-foreground">{y.category}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {y.districtId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{y.assignedMasulName || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {y.removalDate || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getReasonBadge(y.removalReason)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedYouth(y);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Youth Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yosh ma'lumotlari</DialogTitle>
          </DialogHeader>
          {selectedYouth && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <CheckCircle className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedYouth.fullName}</h3>
                  {getReasonBadge(selectedYouth.removalReason)}
                </div>
              </div>
              <div className="grid gap-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tuman</span>
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedYouth.districtId}
                  </Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Manzil</span>
                  <span className="font-medium text-right max-w-[200px]">{selectedYouth.address}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tug'ilgan sana</span>
                  <span className="font-medium">{selectedYouth.birthDate}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Kategoriya</span>
                  <Badge>{selectedYouth.category}</Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Mas'ul hodim</span>
                  <span className="font-medium">{selectedYouth.assignedMasulName || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tashkilot</span>
                  <span className="font-medium">{selectedYouth.organizationName || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Chiqarilgan sana</span>
                  <span className="font-medium">{selectedYouth.removalDate || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Bajarilgan rejalar</span>
                  <Badge variant="secondary">{selectedYouth.plansCount}</Badge>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">O'tkazilgan uchrashuvlar</span>
                  <Badge variant="secondary">{selectedYouth.meetingsCount}</Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
