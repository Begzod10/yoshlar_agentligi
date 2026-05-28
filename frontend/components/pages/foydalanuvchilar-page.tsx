"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { z } from "zod";
import { useApp } from "@/lib/app-context";
import type { ToshkentDistrict, User, UserRole } from "@/lib/types";
import { TOSHKENT_VILOYATI_DISTRICTS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DistrictSelector } from "@/components/ui/district-selector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Edit,
  Eye,
  KeyRound,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCog,
  UserMinus,
  Users,
} from "lucide-react";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  direktor: "Direktor",
  tashkilot_direktori: "Tashkilot direktori",
  masul_hodim: "Mas'ul hodim",
  moderator: "Moderator",
};

const roleColors: Record<UserRole, string> = {
  admin: "bg-primary text-primary-foreground",
  direktor: "bg-accent text-accent-foreground",
  tashkilot_direktori: "bg-chart-3 text-foreground",
  masul_hodim: "bg-chart-4 text-foreground",
  moderator: "bg-muted text-muted-foreground",
};

const scopedRoles: UserRole[] = ["tashkilot_direktori", "masul_hodim"];
const allRoles = Object.keys(roleLabels) as UserRole[];

const userFormSchema = z
  .object({
    fullName: z.string().trim().min(3, "To'liq ism kamida 3 ta belgidan iborat bo'lishi kerak"),
    email: z.string().trim().email("Email noto'g'ri kiritilgan"),
    password: z.string().optional(),
    role: z.enum([
      "admin",
      "direktor",
      "tashkilot_direktori",
      "masul_hodim",
      "moderator",
    ]),
    districtId: z.string().optional(),
    phone: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (scopedRoles.includes(value.role) && !value.districtId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["districtId"],
        message: "Bu rol uchun tuman majburiy",
      });
    }
    if (!scopedRoles.includes(value.role) && value.districtId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["districtId"],
        message: "Admin, direktor va moderator uchun tuman bo'sh bo'lishi kerak",
      });
    }
  });

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function userStatus(user: User) {
  return user.status ?? "active";
}

function formatDate(date?: string) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(date));
}

export function FoydalanuvchilarPage() {
  const { currentUser, users, addUser, updateUser, deleteUser, showToast } =
    useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [addRole, setAddRole] = useState<UserRole>("admin");
  const [editRole, setEditRole] = useState<UserRole>("admin");

  const canManageUsers = currentUser?.role === "admin";

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !normalizedQuery ||
        user.fullName.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      const matchesRole =
        selectedRoles.length === 0 || selectedRoles.includes(user.role);
      const matchesDistrict =
        districtFilter === "all" || user.districtId === districtFilter;
      const matchesStatus =
        statusFilter === "all" || userStatus(user) === statusFilter;

      return matchesSearch && matchesRole && matchesDistrict && matchesStatus;
    });
  }, [districtFilter, searchQuery, selectedRoles, statusFilter, users]);

  const stats = {
    total: users.length,
    active: users.filter((user) => userStatus(user) === "active").length,
    admins: users.filter((user) => user.role === "admin").length,
    scoped: users.filter((user) => scopedRoles.includes(user.role)).length,
  };

  const roleFilterLabel =
    selectedRoles.length === 0
      ? "Barcha rollar"
      : selectedRoles.length === 1
        ? roleLabels[selectedRoles[0]]
        : `${selectedRoles.length} ta rol`;

  const toggleRole = (role: UserRole) => {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    );
  };

  const readForm = (form: HTMLFormElement, requirePassword: boolean) => {
    const formData = new FormData(form);
    const role = formData.get("role") as UserRole;
    const parsed = userFormSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password") || undefined,
      role,
      districtId: scopedRoles.includes(role)
        ? formData.get("districtId") || undefined
        : undefined,
      phone: formData.get("phone") || undefined,
    });

    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message ?? "Forma xato to'ldirilgan", "error");
      return null;
    }
    if (requirePassword && !parsed.data.password) {
      showToast("Parol majburiy", "error");
      return null;
    }

    return parsed.data;
  };

  const handleAddUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = readForm(event.currentTarget, true);
    if (!data) return;

    addUser({
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      districtId: data.districtId as ToshkentDistrict | undefined,
      phone: data.phone,
      status: "active",
      lastLogin: undefined,
    });
    setIsAddDialogOpen(false);
    setAddRole("admin");
    showToast("Foydalanuvchi muvaffaqiyatli qo'shildi", "success");
  };

  const handleEditUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;
    const data = readForm(event.currentTarget, false);
    if (!data) return;

    updateUser(selectedUser.id, {
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      districtId: data.districtId as ToshkentDistrict | undefined,
      phone: data.phone,
      organizationId: undefined,
      organizationName: undefined,
    });
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    showToast("Foydalanuvchi muvaffaqiyatli tahrirlandi", "success");
  };

  const handleDeactivateUser = (user: User) => {
    if (user.id === currentUser?.id) {
      showToast("O'zingizni deaktivatsiya qila olmaysiz", "error");
      return;
    }
    updateUser(user.id, {
      status: userStatus(user) === "active" ? "inactive" : "active",
    });
    showToast(
      userStatus(user) === "active"
        ? "Foydalanuvchi deaktivatsiya qilindi"
        : "Foydalanuvchi faollashtirildi",
      "success"
    );
  };

  const handleDeleteUser = () => {
    if (!deleteCandidate) return;
    if (deleteCandidate.id === currentUser?.id) {
      showToast("O'zingizni o'chira olmaysiz", "error");
      return;
    }
    deleteUser(deleteCandidate.id);
    setDeleteCandidate(null);
    showToast("Foydalanuvchi o'chirildi", "success");
  };

  const handleResetPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("newPassword") || "");
    if (password.length < 6) {
      showToast("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak", "error");
      return;
    }
    setIsResetDialogOpen(false);
    setSelectedUser(null);
    showToast("Parol qayta o'rnatildi", "success");
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Foydalanuvchilar</h1>
          <p className="text-muted-foreground">
            Admin uchun foydalanuvchilar, rollar va tuman biriktirishlari
          </p>
        </div>
        {canManageUsers && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Yangi foydalanuvchi
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami foydalanuvchilar
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faol
            </CardTitle>
            <UserCog className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Adminlar
            </CardTitle>
            <Shield className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tuman rollari
            </CardTitle>
            <MapPin className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scoped}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ism yoki email bo'yicha qidirish..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between bg-transparent">
                  {roleFilterLabel}
                  <Badge variant="secondary">{selectedRoles.length || "all"}</Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 space-y-3">
                {allRoles.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={() => toggleRole(role)}
                    />
                    <span>{roleLabels[role]}</span>
                  </label>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedRoles([])}
                >
                  Tozalash
                </Button>
              </PopoverContent>
            </Popover>
            <DistrictSelector
              value={districtFilter as ToshkentDistrict | "all"}
              onValueChange={(value) => setDistrictFilter(value)}
              className="w-full"
              placeholder="Tuman"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Holat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="active">Faol</SelectItem>
                <SelectItem value="inactive">Nofaol</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foydalanuvchi</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Tuman</TableHead>
                <TableHead>Oxirgi kirish</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Foydalanuvchilar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.districtId ? (
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {user.districtId}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(user.lastLogin)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          userStatus(user) === "active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-muted bg-muted text-muted-foreground"
                        )}
                      >
                        {userStatus(user) === "active" ? "Faol" : "Nofaol"}
                      </Badge>
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
                              setSelectedUser(user);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ko'rish
                          </DropdownMenuItem>
                          {canManageUsers && (
                            <>
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Tahrirlash
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsResetDialogOpen(true);
                                }}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Parolni reset
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeactivateUser(user)}>
                                <UserMinus className="mr-2 h-4 w-4" />
                                {userStatus(user) === "active"
                                  ? "Deaktivatsiya"
                                  : "Faollashtirish"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteCandidate(user)}
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

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Yangi foydalanuvchi</DialogTitle>
            <DialogDescription>
              Rolga qarab tuman maydoni avtomatik talab qilinadi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser}>
            <UserForm role={addRole} onRoleChange={setAddRole} requirePassword />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button type="submit">Qo'shish</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Foydalanuvchi ma'lumotlari</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {initials(selectedUser.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.fullName}</h3>
                  <Badge className={roleColors[selectedUser.role]}>
                    {roleLabels[selectedUser.role]}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                <InfoRow label="Email" value={selectedUser.email} />
                <InfoRow label="Telefon" value={selectedUser.phone || "-"} />
                <InfoRow label="Tuman" value={selectedUser.districtId || "-"} />
                <InfoRow label="Holat" value={userStatus(selectedUser) === "active" ? "Faol" : "Nofaol"} />
                <InfoRow label="Oxirgi kirish" value={formatDate(selectedUser.lastLogin)} />
                <InfoRow label="Qo'shilgan sana" value={formatDate(selectedUser.createdAt)} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Foydalanuvchini tahrirlash</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditUser}>
              <UserForm
                user={selectedUser}
                role={editRole}
                onRoleChange={setEditRole}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Bekor qilish
                </Button>
                <Button type="submit">Saqlash</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Parolni qayta o'rnatish</DialogTitle>
            <DialogDescription>
              {selectedUser?.fullName} uchun yangi parol kiriting.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Yangi parol</Label>
              <Input id="newPassword" name="newPassword" type="password" required />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResetDialogOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button type="submit">Reset</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteCandidate)}
        onOpenChange={(open) => !open && setDeleteCandidate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Foydalanuvchini o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteCandidate?.fullName}" tizimdan o'chiriladi. Bu amalni tasdiqlang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteUser}
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserForm({
  user,
  role,
  onRoleChange,
  requirePassword = false,
}: {
  user?: User;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  requirePassword?: boolean;
}) {
  const needsDistrict = scopedRoles.includes(role);

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="fullName">To'liq ism</Label>
        <Input
          id="fullName"
          name="fullName"
          required
          defaultValue={user?.fullName}
          placeholder="F.I.O."
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={user?.email}
          placeholder="email@example.com"
        />
      </div>
      {requirePassword && (
        <div className="grid gap-2">
          <Label htmlFor="password">Parol</Label>
          <Input id="password" name="password" type="password" required />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={user?.phone}
          placeholder="+998 XX XXX XX XX"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">Rol</Label>
        <Select
          name="role"
          value={role}
          onValueChange={(value) => onRoleChange(value as UserRole)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Rolni tanlang" />
          </SelectTrigger>
          <SelectContent>
            {allRoles.map((item) => (
              <SelectItem key={item} value={item}>
                {roleLabels[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {needsDistrict && (
        <div className="grid gap-2">
          <Label htmlFor="districtId">Tuman</Label>
          <Select name="districtId" defaultValue={user?.districtId}>
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
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
