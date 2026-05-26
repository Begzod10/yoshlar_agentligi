"use client";

import React from "react"

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import type { Meeting } from "@/lib/types";
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
  Trash2,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Video,
  Users,
} from "lucide-react";

export function UchrashuvlarPage() {
  const {
    currentUser,
    meetings,
    youth,
    masullar,
    addMeeting,
    updateMeeting,
    deleteMeeting,
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

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

  // Filter meetings based on role and selection
  let filteredMeetings = meetings.filter((m) => {
    // Role-based filtering
    if (isMasul) {
      if (m.masulId !== currentUser?.id) return false;
    } else if (isTashkilotDirektor && currentUser?.districtId) {
      if (!youthIds.includes(m.youthId)) return false;
    } else if (selectedDistrict) {
      if (!youthIds.includes(m.youthId)) return false;
    }

    // Status filter
    if (statusFilter !== "all" && m.status !== statusFilter) return false;

    // Type filter
    if (typeFilter !== "all" && m.type !== typeFilter) return false;

    // Search filter
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.youthName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Statistics
  const totalMeetings = filteredMeetings.length;
  const completedMeetings = filteredMeetings.filter((m) => m.status === "completed").length;
  const scheduledMeetings = filteredMeetings.filter((m) => m.status === "scheduled").length;
  const cancelledMeetings = filteredMeetings.filter((m) => m.status === "cancelled").length;

  const getStatusBadge = (status: Meeting["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-accent/10 text-accent border-accent/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            O'tkazildi
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Clock className="mr-1 h-3 w-3" />
            Rejalashtirilgan
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

  const getTypeBadge = (type: Meeting["type"]) => {
    switch (type) {
      case "individual":
        return (
          <Badge variant="outline">
            <Users className="mr-1 h-3 w-3" />
            Individual
          </Badge>
        );
      case "group":
        return (
          <Badge variant="outline">
            <Users className="mr-1 h-3 w-3" />
            Guruhiy
          </Badge>
        );
      case "home_visit":
        return (
          <Badge variant="outline">
            <MapPin className="mr-1 h-3 w-3" />
            Uy tashrifi
          </Badge>
        );
      case "online":
        return (
          <Badge variant="outline">
            <Video className="mr-1 h-3 w-3" />
            Online
          </Badge>
        );
    }
  };

  const handleAddMeeting = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const youthId = formData.get("youthId") as string;
    const selectedYouth = youth.find((y) => y.id === youthId);

    const masulId = isMasul
      ? currentUser?.id || ""
      : (formData.get("masulId") as string);
    const selectedMasul = masullar.find((m) => m.id === masulId);

    const newMeeting: Omit<Meeting, "id" | "createdAt"> = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      youthId,
      youthName: selectedYouth?.fullName || "",
      masulId,
      masulName: selectedMasul?.fullName || "",
      date: formData.get("date") as string,
      time: formData.get("time") as string,
      location: formData.get("location") as string,
      type: formData.get("type") as Meeting["type"],
      status: "scheduled",
      notes: "",
    };

    addMeeting(newMeeting);
    setIsAddDialogOpen(false);
    showToast("Uchrashuv muvaffaqiyatli qo'shildi", "success");
  };

  const handleUpdateStatus = (meeting: Meeting, newStatus: Meeting["status"]) => {
    updateMeeting(meeting.id, { status: newStatus });
    showToast("Uchrashuv holati yangilandi", "success");
  };

  const handleDeleteMeeting = (meeting: Meeting) => {
    if (confirm(`"${meeting.title}" uchrashuvni o'chirishni tasdiqlaysizmi?`)) {
      deleteMeeting(meeting.id);
      showToast("Uchrashuv o'chirildi", "success");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Uchrashuvlar</h1>
          <p className="text-muted-foreground">
            Yoshlar bilan uchrashuvlarni rejalashtirish va kuzatish
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Uchrashuv qo'shish
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami uchrashuvlar
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMeetings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              O'tkazildi
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{completedMeetings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejalashtirilgan
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{scheduledMeetings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bekor qilingan
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{cancelledMeetings}</div>
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
                placeholder="Uchrashuv nomi, yosh yoki manzil bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Holat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="scheduled">Rejalashtirilgan</SelectItem>
                <SelectItem value="completed">O'tkazildi</SelectItem>
                <SelectItem value="cancelled">Bekor qilingan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Turi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha turlar</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="group">Guruhiy</SelectItem>
                <SelectItem value="home_visit">Uy tashrifi</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Meetings Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Uchrashuv</TableHead>
                <TableHead>Yosh</TableHead>
                <TableHead>Sana/Vaqt</TableHead>
                <TableHead>Manzil</TableHead>
                <TableHead className="text-center">Turi</TableHead>
                <TableHead className="text-center">Holat</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMeetings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Uchrashuvlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filteredMeetings.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{meeting.title}</p>
                          <p className="text-sm text-muted-foreground">{meeting.masulName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{meeting.youthName}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{meeting.date}</p>
                        <p className="text-muted-foreground">{meeting.time}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {meeting.location}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{getTypeBadge(meeting.type)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(meeting.status)}</TableCell>
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
                              setSelectedMeeting(meeting);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ko'rish
                          </DropdownMenuItem>
                          {canEdit && meeting.status === "scheduled" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUpdateStatus(meeting, "completed")}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                O'tkazildi
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(meeting, "cancelled")}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Bekor qilish
                              </DropdownMenuItem>
                            </>
                          )}
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteMeeting(meeting)}
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

      {/* Add Meeting Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yangi uchrashuv qo'shish</DialogTitle>
            <DialogDescription>
              Uchrashuv ma'lumotlarini kiriting
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMeeting}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Uchrashuv nomi</Label>
                <Input id="title" name="title" required placeholder="Uchrashuv mavzusi" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Tavsif</Label>
                <Textarea id="description" name="description" placeholder="Uchrashuv haqida qisqacha ma'lumot" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="youthId">Yosh</Label>
                <Select name="youthId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Yoshni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredYouth.filter(y => y.status === "active").map((y) => (
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
                  <Label htmlFor="date">Sana</Label>
                  <Input id="date" name="date" type="date" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">Vaqt</Label>
                  <Input id="time" name="time" type="time" required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Manzil</Label>
                <Input id="location" name="location" required placeholder="Uchrashuv o'tkaziladigan joy" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Uchrashuv turi</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Turni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="group">Guruhiy</SelectItem>
                    <SelectItem value="home_visit">Uy tashrifi</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
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

      {/* View Meeting Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Uchrashuv ma'lumotlari</DialogTitle>
          </DialogHeader>
          {selectedMeeting && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedMeeting.title}</h3>
                  <div className="flex gap-2 mt-1">
                    {getTypeBadge(selectedMeeting.type)}
                    {getStatusBadge(selectedMeeting.status)}
                  </div>
                </div>
              </div>
              {selectedMeeting.description && (
                <p className="text-muted-foreground">{selectedMeeting.description}</p>
              )}
              <div className="grid gap-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Yosh</span>
                  <span className="font-medium">{selectedMeeting.youthName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Mas'ul hodim</span>
                  <span className="font-medium">{selectedMeeting.masulName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Sana</span>
                  <span className="font-medium">{selectedMeeting.date}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Vaqt</span>
                  <span className="font-medium">{selectedMeeting.time}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Manzil</span>
                  <span className="font-medium">{selectedMeeting.location}</span>
                </div>
                {selectedMeeting.notes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground block mb-1">Eslatmalar</span>
                    <p className="text-sm">{selectedMeeting.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
