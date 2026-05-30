"use client";

import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import { TOSHKENT_VILOYATI_DISTRICTS, type ToshkentDistrict } from "@/lib/types";
import { districtColors } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface DistrictSelectorProps {
  value?: ToshkentDistrict | "all";
  onValueChange?: (value: ToshkentDistrict | "all") => void;
  showAllOption?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function DistrictSelector({
  value,
  onValueChange,
  showAllOption = true,
  disabled = false,
  className,
  placeholder = "Tumanni tanlang",
}: DistrictSelectorProps) {
  const { selectedDistrict, setSelectedDistrict, canViewAllDistricts } = useApp();

  const currentValue = value ?? selectedDistrict;
  const handleChange = onValueChange ?? setSelectedDistrict;
  const canShowAll = showAllOption && canViewAllDistricts();

  return (
    <Select
      value={currentValue}
      onValueChange={(val) => handleChange(val as ToshkentDistrict | "all")}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-[220px]", className)}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {canShowAll && (
          <SelectItem value="all">
            <span className="font-medium">Barcha tumanlar</span>
          </SelectItem>
        )}
        {TOSHKENT_VILOYATI_DISTRICTS.map((district) => (
          <SelectItem key={district} value={district}>
            {district}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface DistrictBadgeProps {
  districtId: ToshkentDistrict;
  className?: string;
  size?: "sm" | "default";
}

export function DistrictBadge({
  districtId,
  className,
  size = "default",
}: DistrictBadgeProps) {
  const colorClass = districtColors[districtId] || "bg-gray-100 text-gray-800";

  return (
    <Badge
      variant="secondary"
      className={cn(
        colorClass,
        size === "sm" && "text-xs px-1.5 py-0.5",
        className
      )}
    >
      <MapPin className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      {districtId.replace(" tumani", "")}
    </Badge>
  );
}

interface DistrictFilterProps {
  className?: string;
}

export function DistrictFilter({ className }: DistrictFilterProps) {
  const { currentUser, canViewAllDistricts, getUserDistrict } = useApp();

  if (!currentUser) return null;

  // If user can only see one district, show a badge instead of selector
  if (!canViewAllDistricts()) {
    const userDistrict = getUserDistrict();
    if (userDistrict) {
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <span className="text-sm text-muted-foreground">Tuman:</span>
          <DistrictBadge districtId={userDistrict} />
        </div>
      );
    }
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground hidden sm:inline">Tuman:</span>
      <DistrictSelector />
    </div>
  );
}
