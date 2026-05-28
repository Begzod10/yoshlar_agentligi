import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { config } from "@/lib/config";
import { getAccessToken } from "@/lib/auth/storage";
import type { Page, UserRole } from "@/lib/api/types";

export interface AuditLogRead {
  id: string;
  userId: string;
  role: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogParams {
  actor?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export interface SystemInfo {
  appEnv: string;
  appName: string;
  version?: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
}

export interface TableCounts {
  users: number;
  organizations: number;
  youth: number;
  plans: number;
  meetings: number;
  flags: number;
  auditLog: number;
}

export interface BackupRead {
  id: string;
  label: string;
  sizeBytes: number;
  createdAt: string;
}

export type YouthStatus = "active" | "graduated" | "removed";

export interface YouthRead {
  id: string;
  fullName: string;
  districtId: string;
  masulId: string | null;
  organizationId: string | null;
  status: YouthStatus;
  contact: string | null;
  dateOfBirth: string | null;
  address: string | null;
  notes: string | null;
  removalProposal: Record<string, unknown> | null;
  createdAt: string;
}

export function useAdminAuditLog(params: AuditLogParams = {}) {
  return useQuery({
    queryKey: ["admin", "audit-log", params],
    queryFn: () =>
      api.get<Page<AuditLogRead>>("/api/admin/audit-log", {
        query: {
          actor: params.actor,
          action: params.action,
          entity_type: params.entityType,
          from: params.from,
          to: params.to,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
        },
      }),
    retry: false,
    enabled: params.enabled ?? true,
  });
}

export function useAdminSystemInfo(enabled = true) {
  return useQuery({
    queryKey: ["admin", "system", "info"],
    queryFn: () => api.get<SystemInfo>("/api/admin/system/info"),
    retry: false,
    enabled,
  });
}

export function useAdminTableCounts(enabled = true) {
  return useQuery({
    queryKey: ["admin", "system", "counts"],
    queryFn: () => api.get<TableCounts>("/api/admin/system/counts"),
    retry: false,
    enabled,
  });
}

export function useToggleMaintenance() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: { enabled: boolean; message?: string | null }) =>
      api.post<SystemInfo>("/api/admin/system/maintenance", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "system"] });
    },
  });
}

export function useAdminBackups(enabled = true) {
  return useQuery({
    queryKey: ["admin", "backups"],
    queryFn: () => api.get<BackupRead[]>("/api/admin/backups"),
    retry: false,
    enabled,
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<BackupRead>("/api/admin/backups"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "backups"] });
    },
  });
}

export function useRestoreBackup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (backupId: string) =>
      api.post<void>(`/api/admin/backups/${backupId}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useForceAssignMasul() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      youthId,
      masulId,
      overrideDistrict,
    }: {
      youthId: string;
      masulId: string;
      overrideDistrict: boolean;
    }) =>
      api.post<YouthRead>(`/api/admin/youth/${youthId}/force-assign-masul`, {
        masulId,
        overrideDistrict,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useForceYouthStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ youthId, status }: { youthId: string; status: YouthStatus }) =>
      api.post<YouthRead>(`/api/admin/youth/${youthId}/force-status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useRestoreYouth() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (youthId: string) =>
      api.post<YouthRead>(`/api/admin/youth/${youthId}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function buildAdminReportUrl(
  kind: "agency" | "district",
  options: {
    districtId?: string;
    from?: string;
    to?: string;
    includePii?: boolean;
  } = {}
) {
  const path =
    kind === "agency"
      ? "/api/admin/reports/agency.csv"
      : `/api/admin/reports/district/${encodeURIComponent(options.districtId ?? "")}.csv`;
  const url = new URL(`${config.apiUrl}${path}`);

  if (options.from) url.searchParams.set("from", options.from);
  if (options.to) url.searchParams.set("to", options.to);
  if (options.includePii !== undefined) {
    url.searchParams.set("include_pii", String(options.includePii));
  }

  return url.toString();
}

export async function downloadAdminReport(
  kind: "agency" | "district",
  options: {
    districtId?: string;
    from?: string;
    to?: string;
    includePii?: boolean;
  } = {}
) {
  const token = getAccessToken();
  const res = await fetch(buildAdminReportUrl(kind, options), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    throw new Error(res.statusText || "Report download failed");
  }

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const suffix = kind === "agency" ? "agency" : options.districtId ?? "district";
  link.href = href;
  link.download = `admin-${suffix}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export const adminRoleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  direktor: "Direktor",
  tashkilot_direktori: "Tashkilot direktori",
  masul_hodim: "Mas'ul hodim",
  moderator: "Moderator",
};
