"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { z } from "zod";
import { useApp } from "@/lib/app-context";
import type { ToshkentDistrict } from "@/lib/types";
import { TOSHKENT_VILOYATI_DISTRICTS } from "@/lib/types";
import { useCurrentUser } from "@/lib/auth/session";
import type { User, UserRole } from "@/lib/api/types";
import {
  useAdminUsers,
  useCreateAdminUser,
  useDeleteAdminUser,
  useResetAdminUserPassword,
  useUpdateAdminUser,
} from "@/lib/api/hooks/use-admin-users";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Copy,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
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
const defaultPassword = "12345678";

const userFormSchema = z
  .object({
    fullName: z.string().trim().min(3, "To'liq ism kamida 3 ta belgidan iborat bo'lishi kerak"),
    email: z.string().trim().email("Email noto'g'ri kiritilgan"),
    password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak").optional(),
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
  return user.isActive ? "active" : "inactive";
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
  const { showToast } = useApp();
  const sessionUser = useCurrentUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [addRole, setAddRole] = useState<UserRole>("admin");
  const [editRole, setEditRole] = useState<UserRole>("admin");

  const usersQuery = useAdminUsers({
    role: selectedRole === "all" ? undefined : selectedRole,
    districtId: districtFilter === "all" ? undefined : districtFilter,
    search: searchQuery.trim() || undefined,
    page,
    limit: 50,
  });
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();
  const resetUserPassword = useResetAdminUserPassword();

  const users = usersQuery.data?.data ?? [];
  const canManageUsers = sessionUser?.role === "admin";
  const isMutating =
    createUser.isPending ||
    updateUser.isPending ||
    deleteUser.isPending ||
    resetUserPassword.isPending;

  const filteredUsers = users;
  const totalUsers = usersQuery.data?.total ?? 0;
  const userLimit = usersQuery.data?.limit ?? 50;
  const userPage = usersQuery.data?.page ?? page;
  const userTotalPages = Math.max(1, Math.ceil(totalUsers / userLimit));
  const firstUser = totalUsers === 0 ? 0 : (userPage - 1) * userLimit + 1;
  const lastUser = Math.min(userPage * userLimit, totalUsers);

  const stats = {
    total: usersQuery.data?.total ?? users.length,
    active: users.filter((user) => userStatus(user) === "active").length,
    admins: users.filter((user) => user.role === "admin").length,
    scoped: users.filter((user) => scopedRoles.includes(user.role)).length,
  };

  useEffect(() => {
    setPage(1);
  }, [districtFilter, searchQuery, selectedRole]);

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
    void submitAddUser(event);
  };

  const submitAddUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = readForm(event.currentTarget, true);
    if (!data) return;

    try {
      await createUser.mutateAsync({
        fullName: data.fullName,
        email: data.email,
        password: data.password ?? "",
        role: data.role,
        districtId: data.districtId ?? null,
        phone: data.phone || null,
      });
      setIsAddDialogOpen(false);
      setAddRole("admin");
      showToast("Foydalanuvchi muvaffaqiyatli qo'shildi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Foydalanuvchi qo'shilmadi", "error");
    }
  };

  const handleEditUser = (event: React.FormEvent<HTMLFormElement>) => {
    void submitEditUser(event);
  };

  const submitEditUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") || "").trim();
    const phone = String(formData.get("phone") || "").trim();

    if (fullName.length < 3) {
      showToast("To'liq ism kamida 3 ta belgidan iborat bo'lishi kerak", "error");
      return;
    }

    try {
      await updateUser.mutateAsync({
        id: selectedUser.id,
        body: {
          fullName,
          phone: phone || null,
        },
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      showToast("Foydalanuvchi muvaffaqiyatli tahrirlandi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Foydalanuvchi tahrirlanmadi", "error");
    }
  };

  const handleDeactivateUser = (user: User) => {
    void toggleUserActive(user);
  };

  const toggleUserActive = async (user: User) => {
    if (user.id === sessionUser?.id) {
      showToast("O'zingizni deaktivatsiya qila olmaysiz", "error");
      return;
    }
    try {
      await updateUser.mutateAsync({
        id: user.id,
        body: { isActive: !user.isActive },
      });
      showToast(
        user.isActive
          ? "Foydalanuvchi deaktivatsiya qilindi"
          : "Foydalanuvchi faollashtirildi",
        "success"
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Holat yangilanmadi", "error");
    }
  };

  const handleDeleteUser = () => {
    void submitDeleteUser();
  };

  const submitDeleteUser = async () => {
    if (!deleteCandidate) return;
    if (deleteCandidate.id === sessionUser?.id) {
      showToast("O'zingizni o'chira olmaysiz", "error");
      return;
    }
    try {
      await deleteUser.mutateAsync(deleteCandidate.id);
      setDeleteCandidate(null);
      showToast("Foydalanuvchi o'chirildi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Foydalanuvchi o'chirilmadi", "error");
    }
  };

  const handleResetPassword = () => {
    if (!selectedUser) return;
    void submitResetPassword(selectedUser);
  };

  const submitResetPassword = async (user: User) => {
    try {
      const result = await resetUserPassword.mutateAsync(user.id);
      setResetPassword(result.password);
      await copyPassword(result.password, false);
      showToast("Parol qayta o'rnatildi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Parol qayta o'rnatilmadi", "error");
    }
  };

  const copyPassword = async (password: string, notify = true) => {
    try {
      await navigator.clipboard.writeText(password);
      if (notify) {
        showToast("Parol nusxalandi", "success");
      }
    } catch {
      if (notify) {
        showToast("Parolni nusxalab bo'lmadi", "error");
      }
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setIsEditDialogOpen(true);
  };

  /*
    The legacy mock context still powers other pages. Admin users below are
    intentionally read from /api/admin/users and not mirrored into mock state.
  */

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
          <Button onClick={() => setIsAddDialogOpen(true)} disabled={isMutating}>
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
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ism yoki email bo'yicha qidirish..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha rollar</SelectItem>
                {allRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DistrictSelector
              value={districtFilter as ToshkentDistrict | "all"}
              onValueChange={(value) => setDistrictFilter(value)}
              className="w-full"
              placeholder="Tuman"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="max-h-[520px] overflow-y-auto p-0">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
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
              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Foydalanuvchilar yuklanmoqda...
                  </TableCell>
                </TableRow>
              ) : usersQuery.isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-destructive"
                  >
                    Foydalanuvchilarni yuklab bo'lmadi
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
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
                    <TableCell>{formatDate(user.lastLoginAt ?? undefined)}</TableCell>
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
                                  setResetPassword(null);
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
          {totalUsers > userLimit && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                {firstUser}-{lastUser} / {totalUsers} ta
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 bg-transparent"
                  disabled={userPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Oldingi
                </Button>
                <span className="min-w-16 text-center">
                  {userPage}/{userTotalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 bg-transparent"
                  disabled={userPage >= userTotalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Keyingi
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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
              <Button type="submit" disabled={createUser.isPending}>
                Qo'shish
              </Button>
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
                <InfoRow label="Oxirgi kirish" value={formatDate(selectedUser.lastLoginAt ?? undefined)} />
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
                readOnlyIdentity
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  Saqlash
                </Button>
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
          <div className="space-y-4">
            {resetPassword ? (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-sm text-muted-foreground">Yangi parol</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="min-w-0 flex-1 break-all font-mono text-base font-semibold">
                    {resetPassword}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void copyPassword(resetPassword)}
                    aria-label="Parolni nusxalash"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Backend yangi vaqtinchalik parol yaratadi.
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResetDialogOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button
                type="button"
                onClick={handleResetPassword}
                disabled={resetUserPassword.isPending}
              >
                Reset
              </Button>
            </DialogFooter>
          </div>
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
              disabled={deleteUser.isPending}
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
  readOnlyIdentity = false,
}: {
  user?: User;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  requirePassword?: boolean;
  readOnlyIdentity?: boolean;
}) {
  const needsDistrict = scopedRoles.includes(role);
  const [showPassword, setShowPassword] = useState(false);

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
          disabled={readOnlyIdentity}
        />
      </div>
      {requirePassword && (
        <div className="grid gap-2">
          <Label htmlFor="password">Parol</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              defaultValue={defaultPassword}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={user?.phone ?? undefined}
          placeholder="+998 XX XXX XX XX"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="role">Rol</Label>
          <Select
            name="role"
            value={role}
            onValueChange={(value) => onRoleChange(value as UserRole)}
            disabled={readOnlyIdentity}
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
        <div className="grid gap-2">
          <Label htmlFor="districtId">Tuman</Label>
          <Select
            name="districtId"
            defaultValue={user?.districtId ?? undefined}
            disabled={readOnlyIdentity || !needsDistrict}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={needsDistrict ? "Tumanni tanlang" : "Tuman kerak emas"}
              />
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
      </div>
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
