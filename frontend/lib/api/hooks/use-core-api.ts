import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { config } from "@/lib/config";
import { getAccessToken } from "@/lib/auth/storage";
import { api } from "@/lib/api/client";
import type {
  AgencyStats,
  AttendanceUpdate,
  DistrictStatsRead,
  FlagCreate,
  FlagRead,
  FlagUpdate,
  MasulCreate,
  MasulRead,
  MasulUpdate,
  MeetingCreate,
  MeetingRead,
  MeetingUpdate,
  OrganizationCreate,
  OrganizationRead,
  OrganizationUpdate,
  Page,
  PendingRemovalRead,
  PlanCreate,
  PlanRead,
  PlanUpdate,
  ProposeRemoval,
  RejectRemoval,
  YouthCreate,
  YouthRead,
  YouthStatus,
  YouthUpdate,
} from "@/lib/api/types";

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  districtId?: string;
  enabled?: boolean;
};

type EntityListParams = ListParams & {
  organizationId?: string;
  masulId?: string;
  youthId?: string;
  status?: string;
  from?: string;
  to?: string;
  entityType?: string;
  raisedBy?: string;
};

function invalidate(qc: ReturnType<typeof useQueryClient>, keys: string[]) {
  keys.forEach((key) => void qc.invalidateQueries({ queryKey: [key] }));
}

function csvUrl(path: string, query?: Record<string, string | number | boolean | undefined | null>) {
  const url = new URL(`${config.apiUrl}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function downloadCsv(path: string, filename: string, query?: Record<string, string | number | boolean | undefined | null>) {
  const token = getAccessToken();
  const res = await fetch(csvUrl(path, query), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(res.statusText || "CSV yuklab bo'lmadi");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useOrganizations(params: EntityListParams = {}) {
  const { enabled = true } = params;
  return useQuery({
    queryKey: ["organizations", params],
    enabled,
    queryFn: () =>
      api.get<Page<OrganizationRead>>("/api/organizations", {
        query: {
          district_id: params.districtId,
          search: params.search,
          page: params.page,
          limit: params.limit ?? 200,
        },
      }),
  });
}

export function useOrganization(id: string | null) {
  return useQuery({
    queryKey: ["organizations", id],
    enabled: Boolean(id),
    queryFn: () => api.get<OrganizationRead>(`/api/organizations/${id}`),
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrganizationCreate) => api.post<OrganizationRead>("/api/organizations", body),
    onSuccess: () => invalidate(qc, ["organizations", "stats"]),
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: OrganizationUpdate }) =>
      api.patch<OrganizationRead>(`/api/organizations/${id}`, body),
    onSuccess: () => invalidate(qc, ["organizations", "stats"]),
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirm = true }: { id: string; confirm?: boolean }) =>
      api.delete<void>(`/api/organizations/${id}`, { query: { confirm } }),
    onSuccess: () => invalidate(qc, ["organizations", "stats"]),
  });
}

export function useMasullar(params: EntityListParams = {}) {
  const { enabled = true } = params;
  return useQuery({
    queryKey: ["masullar", params],
    enabled,
    queryFn: () =>
      api.get<Page<MasulRead>>("/api/masullar", {
        query: {
          district_id: params.districtId,
          organization_id: params.organizationId,
          search: params.search,
          page: params.page,
          limit: params.limit ?? 200,
        },
      }),
  });
}

export function useCreateMasul() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MasulCreate) => api.post<MasulRead>("/api/masullar", body),
    onSuccess: () => invalidate(qc, ["masullar", "organizations", "stats"]),
  });
}

export function useUpdateMasul() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MasulUpdate }) =>
      api.patch<MasulRead>(`/api/masullar/${id}`, body),
    onSuccess: () => invalidate(qc, ["masullar", "organizations", "stats"]),
  });
}

export function useDeleteMasul() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/masullar/${id}`),
    onSuccess: () => invalidate(qc, ["masullar", "organizations", "stats"]),
  });
}

export function useYouthList(params: EntityListParams = {}) {
  const { enabled = true } = params;
  return useQuery({
    queryKey: ["youth", params],
    enabled,
    queryFn: () =>
      api.get<Page<YouthRead>>("/api/youth", {
        query: {
          district_id: params.districtId,
          masul_id: params.masulId,
          status: params.status,
          search: params.search,
          page: params.page,
          limit: params.limit ?? 200,
        },
      }),
  });
}

export function useCreateYouth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: YouthCreate) => api.post<YouthRead>("/api/youth", body),
    onSuccess: () => invalidate(qc, ["youth", "stats"]),
  });
}

export function useUpdateYouth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: YouthUpdate }) =>
      api.patch<YouthRead>(`/api/youth/${id}`, body),
    onSuccess: () => invalidate(qc, ["youth", "stats"]),
  });
}

export function useDeleteYouth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/youth/${id}`),
    onSuccess: () => invalidate(qc, ["youth", "stats"]),
  });
}

export function useAssignYouthMasul() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ youthId, masulId }: { youthId: string; masulId: string }) =>
      api.post<YouthRead>(`/api/youth/${youthId}/assign-masul`, { masulId }),
    onSuccess: () => invalidate(qc, ["youth", "masullar"]),
  });
}

export function useSetYouthStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ youthId, status }: { youthId: string; status: YouthStatus }) =>
      api.post<YouthRead>(`/api/youth/${youthId}/status`, { status }),
    onSuccess: () => invalidate(qc, ["youth", "stats"]),
  });
}

export function usePlans(params: EntityListParams = {}) {
  const { enabled = true } = params;
  return useQuery({
    queryKey: ["plans", params],
    enabled,
    queryFn: () =>
      api.get<Page<PlanRead>>("/api/plans", {
        query: {
          youth_id: params.youthId,
          status: params.status,
          page: params.page,
          limit: params.limit ?? 200,
        },
      }),
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlanCreate) => api.post<PlanRead>("/api/plans", body),
    onSuccess: () => invalidate(qc, ["plans", "stats"]),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PlanUpdate }) =>
      api.patch<PlanRead>(`/api/plans/${id}`, body),
    onSuccess: () => invalidate(qc, ["plans", "stats"]),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/plans/${id}`),
    onSuccess: () => invalidate(qc, ["plans", "stats"]),
  });
}

export function useMeetings(params: EntityListParams = {}) {
  const { enabled = true } = params;
  return useQuery({
    queryKey: ["meetings", params],
    enabled,
    queryFn: () =>
      api.get<Page<MeetingRead>>("/api/meetings", {
        query: {
          youth_id: params.youthId,
          from: params.from,
          to: params.to,
          page: params.page,
          limit: params.limit ?? 200,
        },
      }),
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingCreate) => api.post<MeetingRead>("/api/meetings", body),
    onSuccess: () => invalidate(qc, ["meetings", "stats"]),
  });
}

export function useUpdateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MeetingUpdate }) =>
      api.patch<MeetingRead>(`/api/meetings/${id}`, body),
    onSuccess: () => invalidate(qc, ["meetings", "stats"]),
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/meetings/${id}`),
    onSuccess: () => invalidate(qc, ["meetings", "stats"]),
  });
}

export function useUpdateMeetingAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AttendanceUpdate }) =>
      api.patch<MeetingRead>(`/api/meetings/${id}/attendance`, body),
    onSuccess: () => invalidate(qc, ["meetings", "stats"]),
  });
}

export function useProposeRemoval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ youthId, body }: { youthId: string; body: ProposeRemoval }) =>
      api.post<YouthRead>(`/api/youth/${youthId}/propose-removal`, body),
    onSuccess: () => invalidate(qc, ["youth", "removals"]),
  });
}

export function useApproveRemoval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (youthId: string) => api.post<YouthRead>(`/api/youth/${youthId}/approve-removal`),
    onSuccess: () => invalidate(qc, ["youth", "removals", "stats"]),
  });
}

export function useRejectRemoval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ youthId, body }: { youthId: string; body: RejectRemoval }) =>
      api.post<YouthRead>(`/api/youth/${youthId}/reject-removal`, body),
    onSuccess: () => invalidate(qc, ["youth", "removals"]),
  });
}

export function usePendingRemovals(enabled = true) {
  return useQuery({
    queryKey: ["removals"],
    enabled,
    queryFn: () => api.get<PendingRemovalRead[]>("/api/removals"),
  });
}

export function useFlags(params: EntityListParams = {}) {
  const { enabled = true } = params;
  return useQuery({
    queryKey: ["flags", params],
    enabled,
    queryFn: () =>
      api.get<Page<FlagRead>>("/api/flags", {
        query: {
          status: params.status,
          entity_type: params.entityType,
          raised_by: params.raisedBy,
          page: params.page,
          limit: params.limit ?? 200,
        },
      }),
  });
}

export function useCreateFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FlagCreate) => api.post<FlagRead>("/api/flags", body),
    onSuccess: () => invalidate(qc, ["flags", "stats"]),
  });
}

export function useUpdateFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: FlagUpdate }) =>
      api.patch<FlagRead>(`/api/flags/${id}`, body),
    onSuccess: () => invalidate(qc, ["flags", "stats"]),
  });
}

export function useAgencyStats(enabled = true) {
  return useQuery({
    queryKey: ["stats", "agency"],
    enabled,
    queryFn: () => api.get<AgencyStats>("/api/stats/agency"),
  });
}

export function useDistrictsStats(enabled = true) {
  return useQuery({
    queryKey: ["stats", "districts"],
    enabled,
    queryFn: () => api.get<DistrictStatsRead[]>("/api/stats/districts"),
  });
}

export function useDistrictStats(districtId: string | null) {
  return useQuery({
    queryKey: ["stats", "district", districtId],
    enabled: Boolean(districtId),
    queryFn: () => api.get<DistrictStatsRead>(`/api/stats/district/${districtId}`),
  });
}

export function useCompareDistricts(a?: string, b?: string) {
  return useQuery({
    queryKey: ["stats", "compare", a, b],
    enabled: Boolean(a && b),
    queryFn: () => api.get<Record<string, unknown>>("/api/stats/compare", { query: { a, b } }),
  });
}

export const downloadReport = {
  agency: (includePii = false) =>
    downloadCsv("/api/reports/agency.csv", "agency-report.csv", { include_pii: includePii }),
  district: (districtId: string, includePii = false) =>
    downloadCsv(`/api/reports/district/${districtId}.csv`, `${districtId}-report.csv`, { include_pii: includePii }),
};
