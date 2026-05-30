"use client";

import React, { useState } from "react";
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
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Video,
  Users,
  List,
  LayoutGrid,
  ClipboardCheck,
  UserX,
  RefreshCw,
  Phone,
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
    getVisibleYouth,
    getVisibleMeetings,
    selectedDistrict,
    addToast,
  } = useApp();

  const isAdmin = currentUser?.role === "admin";
  const isDirektor = currentUser?.role === "direktor";
  const isMasul = currentUser?.role === "masul_hodim";
  const isTashkilotDirektor = currentUser?.role === "tashkilot_direktori";
  const canAdd = isAdmin || isDirektor || isTashkilotDirektor || isMasul;
  const canDelete = isAdmin || isDirektor;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Create meeting modal
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formYouthId, setFormYouthId] = useState("");
  const [formMasulId, setFormMasulId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formType, setFormType] = useState<Meeting["type"]>("individual");
  const [formAgenda, setFormAgenda] = useState("");

  // View modal
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Mark-attended modal
  const [attendModal, setAttendModal] = useState<Meeting | null>(null);
  const [attendStatus, setAttendStatus] = useState<"attended" | "no_show" | "rescheduled">("attended");
  const [attendNotes, setAttendNotes] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  // Filtered youth (scoped to current user for masul)
  const ownYouth = getVisibleYouth();
  const filteredYouth = isMasul
    ? ownYouth
    : youth.filter((y) => {
        if (isTashkilotDirektor && currentUser?.districtId)
          return y.districtId === currentUser.districtId;
        if (selectedDistrict && selectedDistrict !== "all")
          return y.districtId === selectedDistrict;
        return true;
      });

  const youthIds = filteredYouth.map((y) => y.id);

  // Scoped meetings
  const allVisibleMeetings = getVisibleMeetings();

  const filteredMeetings = allVisibleMeetings.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.youthName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Statistics
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
      case "phone":
        return (
          <Badge variant="outline">
            <Phone className="mr-1 h-3 w-3" />
            Telefon
          </Badge>
        );
      default:
        return null;
    }
  };

  // ─── Create meeting ──────────────────────────────────────────────────────────
  const openAddDialog = () => {
    setFormTitle("");
    setFormDescription("");
    setFormYouthId("");
    setFormMasulId("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormTime("");
    setFormLocation("");
    setFormType("individual");
    setFormAgenda("");
    setIsAddDialogOpen(true);
  };

  const handleAddMeeting = () => {
    if (!formYouthId || !formDate || !formTime || !formLocation || !formTitle) {
      addToast({ title: "Xatolik", description: "Majburiy maydonlarni to'ldiring", type: "error" });
      return;
    }

    const selectedYouthObj = filteredYouth.find((y) => y.id === formYouthId);
    if (!selectedYouthObj) {
      addToast({ title: "Xatolik", description: "Tanlangan yosh topilmadi", type: "error" });
      return;
    }

    const masulId = isMasul ? currentUser?.id || "" : formMasulId;
    const selectedMasulObj = masullar.find((m) => m.id === masulId);

    addMeeting({
      title: formTitle,
      description: formDescription,
      youthId: formYouthId,
      youthName: selectedYouthObj.fullName,
      masulId,
      masulName: selectedMasulObj?.fullName || currentUser?.fullName || "",
      date: formDate,
      time: formTime,
      location: formLocation,
      type: formType,
      agenda: formAgenda,
      status: "scheduled",
      notes: "",
    });
    setIsAddDialogOpen(false);
  };

  // ─── Mark attended ───────────────────────────────────────────────────────────
  const openAttendModal = (meeting: Meeting) => {
    setAttendModal(meeting);
    setAttendStatus("attended");
    setAttendNotes(meeting.notes || "");
    setAttachmentName("");
  };

  const submitAttendance = () => {
    if (!attendModal) return;
    updateMeeting(attendModal.id, {
      status: attendStatus === "rescheduled" ? "scheduled" : "completed",
      attendanceStatus: attendStatus,
      notes: attendNotes,
      ...(attachmentName ? { attachments: [attachmentName] } : {}),
    });
    addToast({
      title: "Qatnashuv belgilandi",
      description: `${attendModal.youthName} — ${
        attendStatus === "attended"
          ? "Qatnashdi"
          : attendStatus === "no_show"
          ? "Kelmadi"
          : "Qayta belgilandi"
      }`,
      type: "success",
    });
    setAttendModal(null);
  };

  const handleDeleteMeeting = (meeting: Meeting) => {
    if (confirm(`"${meeting.title}" uchrashuvni o'chirishni tasdiqlaysizmi?`)) {
      deleteMeeting(meeting.id);
    }
  };

  // ─── Calendar view (week grid) ───────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  const getWeekDays = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(d);
      date.setDate(diff + i);
      return date.toISOString().split("T")[0];
    });
  };

  const weekDays = getWeekDays();
  const dayLabels = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

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
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              id="btn-list-view"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <List className="h-4 w-4" />
              Ro'yxat
            </button>
            <button
              id="btn-calendar-view"
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Jadval
            </button>
          </div>
          {canAdd && (
            <Button id="btn-add-meeting" onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Uchrashuv qo'shish
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jami</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredMeetings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">O'tkazildi</CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{completedMeetings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejalashtirilgan</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{scheduledMeetings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bekor qilingan</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{cancelledMeetings}</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar view */}
      {viewMode === "calendar" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Shu hafta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {dayLabels.map((label, i) => (
                <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {label}
                </div>
              ))}
              {weekDays.map((dateStr, i) => {
                const dayMeetings = filteredMeetings.filter((m) => m.date === dateStr);
                const isToday = dateStr === today;
                return (
                  <div
                    key={dateStr}
                    className={`min-h-[80px] rounded-lg p-1.5 border text-xs transition-colors ${
                      isToday
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/40 bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <p
                      className={`text-center font-medium mb-1 ${
                        isToday ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(dateStr).getDate()}
                    </p>
                    <div className="space-y-0.5">
                      {dayMeetings.slice(0, 3).map((m) => (
                        <div
                          key={m.id}
                          className={`truncate rounded px-1 py-0.5 text-xs leading-tight ${
                            m.status === "completed"
                              ? "bg-accent/15 text-accent"
                              : m.status === "cancelled"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          {m.time && <span className="opacity-70">{m.time} </span>}
                          {m.youthName.split(" ")[0]}
                        </div>
                      ))}
                      {dayMeetings.length > 3 && (
                        <p className="text-muted-foreground text-center">+{dayMeetings.length - 3}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Uchrashuv nomi, yosh yoki manzil..."
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
                <SelectItem value="phone">Telefon</SelectItem>
              </SelectContent>
            </Select>
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{meeting.title}</p>
                          {!isMasul && (
                            <p className="text-sm text-muted-foreground">{meeting.masulName}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{meeting.youthName}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{meeting.date}</p>
                        <p className="text-muted-foreground">{meeting.time || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[120px]">{meeting.location}</span>
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
                          {meeting.status === "scheduled" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openAttendModal(meeting)}>
                                <ClipboardCheck className="mr-2 h-4 w-4" />
                                Qatnashuvni belgilash
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateMeeting(meeting.id, { status: "cancelled" })
                                }
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Bekor qilish
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && (
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

      {/* ─── Add Meeting Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi uchrashuv qo'shish</DialogTitle>
            <DialogDescription>Uchrashuv ma'lumotlarini kiriting</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="meeting-title">Mavzu *</Label>
              <Input
                id="meeting-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Uchrashuv mavzusi"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting-youth">Yosh *</Label>
              <Select value={formYouthId} onValueChange={setFormYouthId}>
                <SelectTrigger id="meeting-youth">
                  <SelectValue placeholder="Yoshni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {filteredYouth
                    .filter((y) => y.status === "active")
                    .map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.fullName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {!isMasul && (
              <div className="grid gap-2">
                <Label htmlFor="meeting-masul">Mas'ul hodim *</Label>
                <Select value={formMasulId} onValueChange={setFormMasulId}>
                  <SelectTrigger id="meeting-masul">
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
                <Label htmlFor="meeting-date">Sana *</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meeting-time">Vaqt *</Label>
                <Input
                  id="meeting-time"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting-location">Manzil *</Label>
              <Input
                id="meeting-location"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Uchrashuv o'tkaziladigan joy"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting-type">Uchrashuv turi</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as Meeting["type"])}>
                <SelectTrigger id="meeting-type">
                  <SelectValue placeholder="Turni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="group">Guruhiy</SelectItem>
                  <SelectItem value="home_visit">Uy tashrifi</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="phone">Telefon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting-agenda">Kun tartibi (ixtiyoriy)</Label>
              <Textarea
                id="meeting-agenda"
                value={formAgenda}
                onChange={(e) => setFormAgenda(e.target.value)}
                placeholder="Uchrashuv mavzulari, savollar..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting-desc">Tavsif (ixtiyoriy)</Label>
              <Textarea
                id="meeting-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Qo'shimcha ma'lumot"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button id="btn-save-meeting" onClick={handleAddMeeting}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Meeting Dialog ───────────────────────────────────────────── */}
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
                <p className="text-muted-foreground text-sm">{selectedMeeting.description}</p>
              )}
              <div className="grid gap-3">
                {[
                  { label: "Yosh", val: selectedMeeting.youthName },
                  { label: "Mas'ul hodim", val: selectedMeeting.masulName },
                  { label: "Sana", val: selectedMeeting.date },
                  { label: "Vaqt", val: selectedMeeting.time || "—" },
                  { label: "Manzil", val: selectedMeeting.location },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-muted-foreground text-sm">{label}</span>
                    <span className="font-medium text-sm">{val}</span>
                  </div>
                ))}
                {selectedMeeting.agenda && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm block mb-1">Kun tartibi</span>
                    <p className="text-sm">{selectedMeeting.agenda}</p>
                  </div>
                )}
                {selectedMeeting.notes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm block mb-1">Eslatmalar</span>
                    <p className="text-sm">{selectedMeeting.notes}</p>
                  </div>
                )}
                {selectedMeeting.attendanceStatus && (
                  <div className="pt-2 border-t flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Qatnashuv:</span>
                    <Badge
                      className={
                        selectedMeeting.attendanceStatus === "attended"
                          ? "bg-accent/10 text-accent"
                          : selectedMeeting.attendanceStatus === "no_show"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-orange-500/10 text-orange-600"
                      }
                    >
                      {selectedMeeting.attendanceStatus === "attended"
                        ? "Qatnashdi"
                        : selectedMeeting.attendanceStatus === "no_show"
                        ? "Kelmadi"
                        : "Qayta belgilandi"}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Mark-Attended Modal ──────────────────────────────────────────── */}
      <Dialog open={!!attendModal} onOpenChange={(open) => !open && setAttendModal(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Qatnashuvni belgilash</DialogTitle>
          </DialogHeader>
          {attendModal && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 text-sm">
                <p className="font-medium">{attendModal.title}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {attendModal.youthName} · {attendModal.time || attendModal.date} · {attendModal.location}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Qatnashuv holati</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        value: "attended",
                        label: "Qatnashdi",
                        icon: CheckCircle,
                        cls: "text-accent border-accent/40 bg-accent/5",
                      },
                      {
                        value: "no_show",
                        label: "Kelmadi",
                        icon: UserX,
                        cls: "text-destructive border-destructive/40 bg-destructive/5",
                      },
                      {
                        value: "rescheduled",
                        label: "Qayta",
                        icon: RefreshCw,
                        cls: "text-orange-500 border-orange-500/40 bg-orange-500/5",
                      },
                    ] as const
                  ).map(({ value, label, icon: Icon, cls }) => (
                    <button
                      key={value}
                      id={`attend-${value}`}
                      type="button"
                      onClick={() => setAttendStatus(value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs font-medium ${
                        attendStatus === value
                          ? cls
                          : "border-border text-muted-foreground hover:border-border/80"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attend-notes-meeting">Izoh / natija</Label>
                <Textarea
                  id="attend-notes-meeting"
                  placeholder="Uchrashuv natijasi haqida qisqacha..."
                  rows={3}
                  value={attendNotes}
                  onChange={(e) => setAttendNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attend-file">Ilova (rasm/hujjat)</Label>
                <input
                  id="attend-file"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-border file:text-xs file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                  onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || "")}
                />
                {attachmentName && (
                  <p className="text-xs text-muted-foreground">Tanlandi: {attachmentName}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendModal(null)}>
              Bekor
            </Button>
            <Button id="btn-submit-attend" onClick={submitAttendance}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
