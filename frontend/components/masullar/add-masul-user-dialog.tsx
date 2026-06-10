"use client";

import React, { useState } from "react";
import { z } from "zod";
import { useApp } from "@/lib/app-context";
import { TOSHKENT_VILOYATI_DISTRICTS } from "@/lib/types";
import { useCreateMasul, useOrganizations } from "@/lib/api/hooks/use-core-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";

const DEFAULT_PASSWORD = "12345678";

const formSchema = z.object({
  fullName:       z.string().trim().min(3, "To'liq ism kamida 3 ta belgidan iborat bo'lishi kerak"),
  districtId:     z.string().min(1, "Tuman majburiy"),
  password:       z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak"),
  email:          z.string().trim().email("Email noto'g'ri kiritilgan").optional().or(z.literal("")),
  phone:          z.string().trim().optional(),
  position:       z.string().trim().optional(),
  organizationId: z.string().optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMasulUserDialog({ open, onOpenChange }: Props) {
  const { showToast } = useApp();
  const createMasul = useCreateMasul();

  const [showPassword, setShowPassword] = useState(false);
  const [districtId, setDistrictId]     = useState("");
  const [orgId, setOrgId]               = useState("");

  // Fetch organizations for the selected district
  const { data: orgsData } = useOrganizations({
    districtId: districtId || undefined,
    limit: 100,
    enabled: Boolean(districtId),
  });
  const organizations = orgsData?.data ?? [];

  const handleDistrictChange = (value: string) => {
    setDistrictId(value);
    setOrgId(""); // reset org when district changes
  };

  const handleClose = () => {
    onOpenChange(false);
    setShowPassword(false);
    setDistrictId("");
    setOrgId("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit(e.currentTarget);
  };

  const submit = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const parsed = formSchema.safeParse({
      fullName:       fd.get("fullName"),
      districtId,
      password:       fd.get("password"),
      email:          fd.get("email") || undefined,
      phone:          fd.get("phone") || undefined,
      position:       fd.get("position") || undefined,
      organizationId: orgId || undefined,
    });

    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message ?? "Forma xato to'ldirilgan", "error");
      return;
    }

    const { fullName, password, email, phone, position, organizationId } = parsed.data;

    try {
      await createMasul.mutateAsync({
        fullName,
        districtId,
        password,
        ...(email          ? { email }          : {}),
        ...(phone          ? { phone }          : {}),
        ...(position       ? { position }       : {}),
        ...(organizationId ? { organizationId } : {}),
      });
      handleClose();
      showToast("Mas'ul hodim muvaffaqiyatli qo'shildi", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Qo'shib bo'lmadi", "error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Yangi mas'ul hodim</DialogTitle>
          <DialogDescription>
            Tuman va to'liq ism majburiy. Parol default 12345678.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">

            {/* Full name */}
            <div className="grid gap-2">
              <Label htmlFor="mu-fullName">To'liq ism *</Label>
              <Input id="mu-fullName" name="fullName" required placeholder="F.I.O." />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mu-email">Email</Label>
                <Input id="mu-email" name="email" type="email" placeholder="email@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mu-phone">Telefon</Label>
                <Input id="mu-phone" name="phone" type="tel" placeholder="+998 XX XXX XX XX" />
              </div>
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="mu-password">Parol *</Label>
              <div className="relative">
                <Input
                  id="mu-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  defaultValue={DEFAULT_PASSWORD}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* District + Position */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mu-districtId">Tuman *</Label>
                <Select value={districtId} onValueChange={handleDistrictChange} required>
                  <SelectTrigger id="mu-districtId">
                    <SelectValue placeholder="Tumanni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOSHKENT_VILOYATI_DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mu-position">Lavozim</Label>
                <Input id="mu-position" name="position" placeholder="Masalan: Inspektor" />
              </div>
            </div>

            {/* Organization — shown only after district is selected */}
            <div className="grid gap-2">
              <Label htmlFor="mu-orgId">Tashkilot</Label>
              <Select
                value={orgId}
                onValueChange={setOrgId}
                disabled={!districtId}
              >
                <SelectTrigger id="mu-orgId">
                  <SelectValue
                    placeholder={
                      districtId
                        ? organizations.length > 0
                          ? "Tashkilotni tanlang"
                          : "Tashkilotlar topilmadi"
                        : "Avval tumanni tanlang"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={createMasul.isPending}>
              Qo'shish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
