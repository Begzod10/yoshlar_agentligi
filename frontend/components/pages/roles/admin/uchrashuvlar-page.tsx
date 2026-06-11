"use client";

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-context";
import { adminApi } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/storage";
import { config } from "@/lib/config";
import type { MeetingRead } from "@/lib/api/types";
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
  MapPin,
  Video,
  Users,
  List,
  LayoutGrid,
  ClipboardCheck,
  UserX,
  RefreshCw,
  Phone,
  Loader2,
  Paperclip,
  Maximize2,
  X,
} from "lucide-react";

type MeetingStatus = MeetingRead["attendanceStatus"];

export function AdminUchrashuvlarPage() {
  const { addToast } = useApp();
  const queryClient = useQueryClient();

  // ── Meetings ──────────────────────────────────────────────────────────
  const { data: meetingsData, isLoading: meetingsLoading } = useQuery({
    queryKey: ["admin-meetings"],
    queryFn: () =>
      adminApi.get<{ data: MeetingRead[]; total: number }>("/api/meetings", {
        query: { page: 1, limit: 50 },
      }),
  });

  // ── Name resolution — youth only (masulName comes from the API directly) ──
  const { data: allYouthData } = useQuery({
    queryKey: ["admin-all-youth"],
    queryFn: () =>
      adminApi.get<{ data: { id: string; fullName: string }[] }>("/api/youth", {
        query: { page: 1, limit: 500 },
      }),
    staleTime: 5 * 60 * 1000,
  });

  const youthMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const y of allYouthData?.data ?? []) m[y.id] = y.fullName;
    return m;
  }, [allYouthData]);

  const getYouthName = (id: string) => youthMap[id] ?? id.slice(0, 8) + "...";
  const parseDateParts = (iso: string) => ({ date: iso.slice(0, 10), time: iso.slice(11, 16) });
  const getMeetingLabel = (m: MeetingRead) => m.agenda ?? m.location ?? "Uchrashuv";

  // ── Filter / view state ───────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // ── Add dialog state ──────────────────────────────────────────────────
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDistrict, setFormDistrict] = useState("");
  const [formYouthId, setFormYouthId] = useState("");
  const [formMasulId, setFormMasulId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formType, setFormType] = useState("individual");
  const [formAgenda, setFormAgenda] = useState("");

  // ── Modal state ───────────────────────────────────────────────────────
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRead | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<MeetingRead | null>(null);
  const [attendModal, setAttendModal] = useState<MeetingRead | null>(null);
  const [attendStatus, setAttendStatus] = useState<"attended" | "no_show" | "rescheduled">("attended");
  const [attendNotes, setAttendNotes] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ── District-filtered data for add form ───────────────────────────────
  const { data: formYouthData, isFetching: youthFetching } = useQuery({
    queryKey: ["admin-form-youth", formDistrict],
    enabled: !!formDistrict,
    queryFn: () =>
      adminApi.get<{ data: { id: string; fullName: string; status: string }[] }>("/api/youth", {
        query: { district_id: formDistrict, status: "active", page: 1, limit: 200 },
      }),
  });
  const { data: formMasulData, isFetching: masullarFetching } = useQuery({
    queryKey: ["admin-form-masullar", formDistrict],
    enabled: !!formDistrict,
    queryFn: () =>
      adminApi.get<{ data: { id: string; fullName: string }[] }>("/api/masullar", {
        query: { district_id: formDistrict, page: 1, limit: 200 },
      }),
  });
  const districtYouth = formYouthData?.data ?? [];
  const districtMasullar = formMasulData?.data ?? [];

  // ── Derived ───────────────────────────────────────────────────────────
  const allMeetings = meetingsData?.data ?? [];
  const q = searchQuery.toLowerCase();
  const filteredMeetings = allMeetings.filter((m) => {
    if (statusFilter !== "all" && m.attendanceStatus !== statusFilter) return false;
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    return (
      getYouthName(m.youthId).toLowerCase().includes(q) ||
      (m.location ?? "").toLowerCase().includes(q) ||
      (m.agenda ?? "").toLowerCase().includes(q)
    );
  });

  const attendedCount = filteredMeetings.filter((m) => m.attendanceStatus === "attended").length;
  const scheduledCount = filteredMeetings.filter(
    (m) => m.attendanceStatus === "scheduled" || m.attendanceStatus === "rescheduled",
  ).length;
  const noShowCount = filteredMeetings.filter((m) => m.attendanceStatus === "no_show").length;

  // ── Badges ────────────────────────────────────────────────────────────
  const getStatusBadge = (status: MeetingStatus) => {
    switch (status) {
      case "attended":
        return (
          <Badge className="bg-accent/10 text-accent border-accent/20">
            <CheckCircle className="mr-1 h-3 w-3" />O'tkazildi
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Clock className="mr-1 h-3 w-3" />Rejalashtirilgan
          </Badge>
        );
      case "no_show":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <UserX className="mr-1 h-3 w-3" />Kelmadi
          </Badge>
        );
      case "rescheduled":
        return (
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
            <RefreshCw className="mr-1 h-3 w-3" />Qayta belgilandi
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: string | null) => {
    switch (type) {
      case "individual":
        return <Badge variant="outline"><Users className="mr-1 h-3 w-3" />Individual</Badge>;
      case "group":
        return <Badge variant="outline"><Users className="mr-1 h-3 w-3" />Guruhiy</Badge>;
      case "home_visit":
        return <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />Uy tashrifi</Badge>;
      case "online":
        return <Badge variant="outline"><Video className="mr-1 h-3 w-3" />Online</Badge>;
      case "phone":
        return <Badge variant="outline"><Phone className="mr-1 h-3 w-3" />Telefon</Badge>;
      default:
        return null;
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const openAddDialog = () => {
    setFormDistrict("");
    setFormYouthId("");
    setFormMasulId("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormTime("");
    setFormLocation("");
    setFormType("individual");
    setFormAgenda("");
    setIsAddDialogOpen(true);
  };

  const handleDistrictChange = (district: string) => {
    setFormDistrict(district);
    setFormYouthId("");
    setFormMasulId("");
  };

  const handleAddMeeting = async () => {
    if (!formDistrict || !formYouthId || !formDate || !formTime || !formLocation) {
      addToast({ title: "Xatolik", description: "Majburiy maydonlarni to'ldiring", type: "error" });
      return;
    }
    try {
      setIsSubmitting(true);
      await adminApi.post("/api/meetings", {
        youthId: formYouthId,
        masulId: formMasulId || null,
        scheduledAt: `${formDate}T${formTime}:00`,
        type: formType || null,
        location: formLocation || null,
        agenda: formAgenda || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-meetings"] });
      setIsAddDialogOpen(false);
      addToast({ title: "Uchrashuv qo'shildi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "Uchrashuvni qo'shishda xato yuz berdi", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAttendModal = (meeting: MeetingRead) => {
    setAttendModal(meeting);
    setAttendStatus("attended");
    setAttendNotes(meeting.attendanceNotes ?? "");
    setAttachmentFile(null);
    setRescheduleDate("");
    setRescheduleTime("");
  };

  const submitAttendance = async () => {
    if (!attendModal) return;
    try {
      const fd = new FormData();
      fd.append("attendanceStatus", attendStatus);
      if (attendNotes) fd.append("attendanceNotes", attendNotes);
      fd.append("status", attendStatus === "rescheduled" ? "scheduled" : "completed");
      if (attendStatus === "rescheduled") {
        fd.append("rescheduledDate", rescheduleDate);
        fd.append("rescheduledTime", rescheduleTime);
      }
      if (attachmentFile) fd.append("attachment", attachmentFile, attachmentFile.name);

      const token = getAccessToken();
      const res = await fetch(`${config.apiUrl}/api/meetings/${attendModal.id}/attendance`, {
        method: "PATCH",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error(res.statusText);
      await queryClient.invalidateQueries({ queryKey: ["admin-meetings"] });
      addToast({
        title: "Qatnashuv belgilandi",
        description: `${getYouthName(attendModal.youthId)} — ${
          attendStatus === "attended" ? "Qatnashdi" : attendStatus === "no_show" ? "Kelmadi" : "Qayta belgilandi"
        }`,
        type: "success",
      });
      setAttendModal(null);
    } catch {
      addToast({ title: "Xatolik", description: "Qatnashuvni belgilashda xato yuz berdi", type: "error" });
    }
  };

  const confirmDeleteMeeting = async () => {
    if (!deleteCandidate) return;
    try {
      await adminApi.delete(`/api/meetings/${deleteCandidate.id}`);
      await queryClient.invalidateQueries({ queryKey: ["admin-meetings"] });
      addToast({ title: "O'chirildi", type: "success" });
    } catch {
      addToast({ title: "Xatolik", description: "O'chirishda xato yuz berdi", type: "error" });
    }
    setDeleteCandidate(null);
  };

  // ── Calendar helpers ──────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Uchrashuvlar</h1>
          <p className="text-muted-foreground">Yoshlar bilan uchrashuvlarni rejalashtirish va kuzatish</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <List className="h-4 w-4" />
              Ro'yxat
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Jadval
            </button>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Uchrashuv qo'shish
          </Button>
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
            <div className="text-2xl font-bold text-accent">{attendedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejalashtirilgan</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{scheduledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kelmadi</CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{noShowCount}</div>
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
              {dayLabels.map((label) => (
                <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {label}
                </div>
              ))}
              {weekDays.map((dateStr) => {
                const dayMeetings = filteredMeetings.filter(
                  (m) => m.scheduledAt.slice(0, 10) === dateStr,
                );
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
                    <p className={`text-center font-medium mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {new Date(dateStr).getDate()}
                    </p>
                    <div className="space-y-0.5">
                      {dayMeetings.slice(0, 3).map((m) => (
                        <div
                          key={m.id}
                          className={`truncate rounded px-1 py-0.5 text-xs leading-tight ${
                            m.attendanceStatus === "attended"
                              ? "bg-accent/15 text-accent"
                              : m.attendanceStatus === "no_show"
                              ? "bg-destructive/10 text-destructive"
                              : m.attendanceStatus === "rescheduled"
                              ? "bg-orange-500/10 text-orange-600"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          <span className="opacity-70">{m.scheduledAt.slice(11, 16)} </span>
                          {getYouthName(m.youthId).split(" ")[0]}
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
                placeholder="Yosh, manzil yoki kun tartibi..."
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
                <SelectItem value="scheduled">Rejalashtirilgan</SelectItem>
                <SelectItem value="attended">O'tkazildi</SelectItem>
                <SelectItem value="no_show">Kelmadi</SelectItem>
                <SelectItem value="rescheduled">Qayta belgilandi</SelectItem>
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
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
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
              {meetingsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredMeetings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Uchrashuvlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filteredMeetings.map((meeting) => {
                  const { date, time } = parseDateParts(meeting.scheduledAt);
                  return (
                    <TableRow key={meeting.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{getMeetingLabel(meeting)}</p>
                            <p className="text-sm text-muted-foreground">{meeting.masulName ?? "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{getYouthName(meeting.youthId)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{date}</p>
                          <p className="text-muted-foreground">{time}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[120px]">{meeting.location ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{getTypeBadge(meeting.type)}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(meeting.attendanceStatus)}</TableCell>
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
                            <DropdownMenuItem onClick={() => { setSelectedMeeting(meeting); setIsViewDialogOpen(true); }}>
                              <Eye className="mr-2 h-4 w-4" />Ko'rish
                            </DropdownMenuItem>
                            {(meeting.attendanceStatus === "scheduled" || meeting.attendanceStatus === "rescheduled") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openAttendModal(meeting)}>
                                  <ClipboardCheck className="mr-2 h-4 w-4" />Qatnashuvni belgilash
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCandidate(meeting)}>
                              <Trash2 className="mr-2 h-4 w-4" />O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden">
            {meetingsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Uchrashuvlar topilmadi</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredMeetings.map((meeting) => {
                  const { date, time } = parseDateParts(meeting.scheduledAt);
                  const canMarkAttend = meeting.attendanceStatus === "scheduled" || meeting.attendanceStatus === "rescheduled";
                  return (
                    <div key={meeting.id} className="p-4">
                      {/* Row 1: icon + label + status */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{getMeetingLabel(meeting)}</p>
                            <p className="text-xs text-muted-foreground">{meeting.masulName ?? "—"}</p>
                          </div>
                        </div>
                        {getStatusBadge(meeting.attendanceStatus)}
                      </div>
                      {/* Row 2: youth + date + type */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 pl-[52px] text-sm">
                        <span className="font-medium">{getYouthName(meeting.youthId)}</span>
                        <span className="text-muted-foreground">{date} {time}</span>
                        {getTypeBadge(meeting.type)}
                        {meeting.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />{meeting.location}
                          </span>
                        )}
                      </div>
                      {/* Row 3: action button */}
                      <div className="flex items-center gap-2 pl-[52px]">
                        <Button size="sm" variant="outline" className="h-8 text-xs bg-transparent"
                          onClick={() => { setSelectedMeeting(meeting); setIsViewDialogOpen(true); }}>
                          <Eye className="h-3.5 w-3.5 mr-1" />Ko'rish
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
            {/* Tuman + Uchrashuv turi */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tuman *</Label>
                <Select value={formDistrict} onValueChange={handleDistrictChange}>
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
              <div className="grid gap-2">
                <Label>Uchrashuv turi</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
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
            </div>

            {/* Yosh + Mas'ul hodim */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Yosh *</Label>
                <Select
                  value={formYouthId}
                  onValueChange={setFormYouthId}
                  disabled={!formDistrict || youthFetching}
                >
                  <SelectTrigger>
                    {youthFetching ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Yuklanmoqda...
                      </span>
                    ) : (
                      <SelectValue
                        placeholder={formDistrict ? "Yoshni tanlang" : "Avval tumanni tanlang"}
                      />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {districtYouth.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Mas'ul hodim</Label>
                <Select
                  value={formMasulId}
                  onValueChange={setFormMasulId}
                  disabled={!formDistrict || masullarFetching}
                >
                  <SelectTrigger>
                    {masullarFetching ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Yuklanmoqda...
                      </span>
                    ) : (
                      <SelectValue
                        placeholder={formDistrict ? "Mas'ulni tanlang" : "Avval tumanni tanlang"}
                      />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {districtMasullar.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Sana *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Vaqt *</Label>
                <Input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Manzil *</Label>
              <Input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Uchrashuv o'tkaziladigan joy"
              />
            </div>
            <div className="grid gap-2">
              <Label>Kun tartibi (ixtiyoriy)</Label>
              <Textarea
                value={formAgenda}
                onChange={(e) => setFormAgenda(e.target.value)}
                placeholder="Uchrashuv mavzulari, savollar..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleAddMeeting} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
          {selectedMeeting && (() => {
            const { date, time } = parseDateParts(selectedMeeting.scheduledAt);
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{getMeetingLabel(selectedMeeting)}</h3>
                    <div className="flex gap-2 mt-1">
                      {getTypeBadge(selectedMeeting.type)}
                      {getStatusBadge(selectedMeeting.attendanceStatus)}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3">
                  {[
                    { label: "Yosh", val: getYouthName(selectedMeeting.youthId) },
                    { label: "Mas'ul hodim", val: selectedMeeting.masulName ?? "—" },
                    { label: "Sana", val: date },
                    { label: "Vaqt", val: time },
                    { label: "Manzil", val: selectedMeeting.location ?? "—" },
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
                  {selectedMeeting.attendanceNotes && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground text-sm block mb-1">Izoh</span>
                      <p className="text-sm">{selectedMeeting.attendanceNotes}</p>
                    </div>
                  )}
                  {selectedMeeting.attachments.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground text-sm block mb-2">Ilovalar</span>
                      <div className="space-y-2">
                        {selectedMeeting.attachments.map((att, i) => {
                          const url = `${config.apiUrl}${att.path}`;
                          const isImg = att.content_type?.startsWith("image/") ?? false;
                          return isImg ? (
                            <div key={i} className="relative group rounded-lg overflow-hidden border bg-muted/30">
                              <img src={url} alt={att.filename} className="w-full max-h-48 object-contain" />
                              <button
                                onClick={() => setLightboxUrl(url)}
                                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Maximize2 className="h-4 w-4" />
                              </button>
                              <p className="text-xs text-muted-foreground px-2 py-1">{att.filename} ({Math.round(att.size / 1024)} KB)</p>
                            </div>
                          ) : (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors text-sm text-primary"
                            >
                              <Paperclip className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{att.filename}</span>
                              <span className="text-xs text-muted-foreground shrink-0">({Math.round(att.size / 1024)} KB)</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:hidden flex gap-2 pt-2">
                  {(selectedMeeting.attendanceStatus === "scheduled" || selectedMeeting.attendanceStatus === "rescheduled") && (
                    <Button className="flex-1" onClick={() => { setIsViewDialogOpen(false); openAttendModal(selectedMeeting); }}>
                      <ClipboardCheck className="mr-2 h-4 w-4" />Qatnashuvni belgilash
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => { setIsViewDialogOpen(false); setDeleteCandidate(selectedMeeting); }}>
                    <Trash2 className="mr-2 h-4 w-4" />O'chirish
                  </Button>
                </div>
              </div>
            );
          })()}
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
                <p className="font-medium">{getMeetingLabel(attendModal)}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {getYouthName(attendModal.youthId)} · {attendModal.scheduledAt.slice(11, 16)} ·{" "}
                  {attendModal.location ?? "—"}
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
              {attendStatus === "rescheduled" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Yangi sana *</Label>
                    <Input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vaqt *</Label>
                    <Input
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Izoh / natija</Label>
                <Textarea
                  placeholder="Uchrashuv natijasi haqida qisqacha..."
                  rows={3}
                  value={attendNotes}
                  onChange={(e) => setAttendNotes(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ilova (rasm/hujjat)</Label>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-border file:text-xs file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                />
                {attachmentFile && (
                  attachmentFile.type.startsWith("image/") ? (
                    <div className="relative group rounded-lg overflow-hidden border bg-muted/30">
                      <img src={URL.createObjectURL(attachmentFile)} alt={attachmentFile.name} className="w-full max-h-48 object-contain" />
                      <button
                        onClick={() => setLightboxUrl(URL.createObjectURL(attachmentFile))}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                      <p className="text-xs text-muted-foreground px-2 py-1">{attachmentFile.name} ({Math.round(attachmentFile.size / 1024)} KB)</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Tanlandi: {attachmentFile.name} ({Math.round(attachmentFile.size / 1024)} KB)</p>
                  )
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendModal(null)}>
              Bekor
            </Button>
            <Button
              onClick={submitAttendance}
              disabled={attendStatus === "rescheduled" && (!rescheduleDate || !rescheduleTime)}
            >
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteCandidate)}
        title="Uchrashuvni o'chirish"
        description={
          deleteCandidate
            ? `"${getMeetingLabel(deleteCandidate)}" uchrashuvni o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.`
            : undefined
        }
        onConfirm={confirmDeleteMeeting}
        onCancel={() => setDeleteCandidate(null)}
      />

      {lightboxUrl && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 cursor-zoom-out"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Fayl ko'rinishi"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
