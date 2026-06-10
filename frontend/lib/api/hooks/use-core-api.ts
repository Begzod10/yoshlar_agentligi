import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { config } from "@/lib/config";
import { getAccessToken } from "@/lib/auth/storage";
import { api } from "@/lib/api/client";
import type {
  AgencyStats,
  AiInsight,
  AttendanceUpdate,
  CategoryStats,
  ChangePasswordRequest,
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
  MonitoringDistrict,
  MonitoringMasul,
  MonitoringOrganization,
  MonitoringOverview,
  MonitoringPeriod,
  OrganizationCreate,
  OrganizationRead,
  OrganizationUpdate,
  Page,
  PendingRemovalRead,
  PlanCreate,
  PlanRead,
  PlanUpdate,
  ProfilePreferences,
  ProfilePreferencesUpdate,
  ProfileRead,
  ProfileSession,
  ProfileUpdate,
  ProposeRemoval,
  RecentActivity,
  RevokeSessionsResponse,
  RejectRemoval,
  NotificationPreferences,
  TopYouthStats,
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

type DateRangeParams = {
  from?: string;
  to?: string;
  enabled?: boolean;
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

async function csvError(res: Response): Promise<Error> {
  const payload = await res.json().catch(() => null);
  const message =
    payload?.error?.message ??
    payload?.detail ??
    payload?.message ??
    res.statusText ??
    "CSV yuklab bo'lmadi";
  return new Error(message);
}

async function fetchCsv(path: string, query?: Record<string, string | number | boolean | undefined | null>) {
  const token = getAccessToken();
  return fetch(csvUrl(path, query), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

async function saveCsvResponse(res: Response, filename: string) {
  if (!res.ok) throw await csvError(res);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadCsv(path: string, filename: string, query?: Record<string, string | number | boolean | undefined | null>) {
  await saveCsvResponse(await fetchCsv(path, query), filename);
}

async function downloadCsvWithFallback(
  path: string,
  filename: string,
  query: Record<string, string | number | boolean | undefined | null> | undefined,
  fallback: {
    path: string;
    query?: Record<string, string | number | boolean | undefined | null>;
  }
) {
  const res = await fetchCsv(path, query);
  if (res.status !== 404) {
    await saveCsvResponse(res, filename);
    return;
  }
  await saveCsvResponse(await fetchCsv(fallback.path, fallback.query), filename);
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
          limit: params.limit ?? 50,
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
          limit: params.limit ?? 50,
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
          limit: params.limit ?? 50,
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
          limit: params.limit ?? 50,
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
          limit: params.limit ?? 50,
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
          limit: params.limit ?? 50,
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

export function useAgencyStatsRange(params: DateRangeParams = {}) {
  const { enabled = true } = params;
  return useQuery({
    queryKey: ["stats", "agency", params],
    enabled,
    queryFn: () =>
      api.get<AgencyStats>("/api/stats/agency", {
        query: { from: params.from, to: params.to },
      }),
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

export function useCategoryStats(enabled = true) {
  return useQuery({
    queryKey: ["stats", "categories"],
    enabled,
    queryFn: () => api.get<CategoryStats[]>("/api/stats/categories"),
  });
}

export function useTopYoshlar(limit = 10, enabled = true) {
  return useQuery({
    queryKey: ["stats", "top-yoshlar", limit],
    enabled,
    queryFn: () => api.get<TopYouthStats[]>("/api/stats/top-yoshlar", { query: { limit } }),
  });
}

export function useRecentActivity(limit = 20, enabled = true) {
  return useQuery({
    queryKey: ["stats", "recent-activity", limit],
    enabled,
    queryFn: () => api.get<RecentActivity[]>("/api/stats/recent-activity", { query: { limit } }),
  });
}

export function useAiInsights(enabled = true) {
  return useQuery({
    queryKey: ["stats", "ai-insights"],
    enabled,
    queryFn: () => api.get<AiInsight[]>("/api/stats/ai-insights"),
  });
}

export function useMonitoringOverview(period: MonitoringPeriod = "month", enabled = true) {
  return useQuery({
    queryKey: ["monitoring", "overview", period],
    enabled,
    queryFn: () => api.get<MonitoringOverview>("/api/monitoring/overview", { query: { period } }),
  });
}

export function useMonitoringDistricts(period: MonitoringPeriod = "month", enabled = true) {
  return useQuery({
    queryKey: ["monitoring", "districts", period],
    enabled,
    queryFn: () => api.get<MonitoringDistrict[]>("/api/monitoring/districts", { query: { period } }),
  });
}

export function useMonitoringOrganizations(period: MonitoringPeriod = "month", enabled = true) {
  return useQuery({
    queryKey: ["monitoring", "organizations", period],
    enabled,
    queryFn: () => api.get<MonitoringOrganization[]>("/api/monitoring/organizations", { query: { period } }),
  });
}

export function useMonitoringMasullar(period: MonitoringPeriod = "month", enabled = true) {
  return useQuery({
    queryKey: ["monitoring", "masullar", period],
    enabled,
    queryFn: () => api.get<MonitoringMasul[]>("/api/monitoring/masullar", { query: { period } }),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<ProfileRead>("/api/profile"),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileUpdate) => api.patch<ProfileRead>("/api/profile", body),
    onSuccess: (profile) => {
      qc.setQueryData(["profile"], profile);
      qc.setQueryData(["session", "me"], profile);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) =>
      api.post<void>("/api/profile/change-password", body),
  });
}

export function useProfilePreferences() {
  return useQuery({
    queryKey: ["profile", "preferences"],
    queryFn: () => api.get<ProfilePreferences>("/api/profile/preferences"),
  });
}

export function useUpdateProfilePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfilePreferencesUpdate) =>
      api.put<ProfilePreferences>("/api/profile/preferences", body),
    onSuccess: (preferences) => {
      qc.setQueryData(["profile", "preferences"], preferences);
      qc.setQueryData(["profile", "notifications"], preferences.notifications);
    },
  });
}

export function useProfileNotifications() {
  return useQuery({
    queryKey: ["profile", "notifications"],
    queryFn: () => api.get<NotificationPreferences>("/api/profile/notifications"),
  });
}

export function useUpdateProfileNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationPreferences) =>
      api.put<NotificationPreferences>("/api/profile/notifications", body),
    onSuccess: (notifications) => {
      qc.setQueryData(["profile", "notifications"], notifications);
      qc.setQueryData<ProfilePreferences | undefined>(["profile", "preferences"], (current) =>
        current ? { ...current, notifications } : current
      );
    },
  });
}

export function useProfileSessions() {
  return useQuery({
    queryKey: ["profile", "sessions"],
    queryFn: () => api.get<ProfileSession[]>("/api/profile/sessions"),
  });
}

export function useRevokeProfileSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.delete<void>(`/api/profile/sessions/${sessionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", "sessions"] });
    },
  });
}

export function useRevokeOtherProfileSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<RevokeSessionsResponse>("/api/profile/sessions"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", "sessions"] });
    },
  });
}

export const downloadReport = {
  agency: (includePii = false, query?: { from?: string; to?: string }) =>
    downloadCsv("/api/reports/agency.csv", "agency-report.csv", {
      from: query?.from,
      to: query?.to,
      include_pii: includePii,
    }),
  district: (districtId: string, includePii = false) =>
    downloadCsvWithFallback(
      `/api/reports/district/${encodeURIComponent(districtId)}.csv`,
      `${districtId}-report.csv`,
      { include_pii: includePii },
      {
        path: "/api/reports/agency.csv",
        query: { district_id: districtId, include_pii: includePii },
      }
    ),
  organizations: (districtId?: string) =>
    downloadCsv("/api/reports/organizations.csv", "organizations-report.csv", { district_id: districtId }),
  masullar: (districtId?: string) =>
    downloadCsv("/api/reports/masullar.csv", "masullar-report.csv", { district_id: districtId }),
  plans: (districtId?: string, includePii = false) =>
    downloadCsv("/api/reports/plans.csv", "plans-report.csv", { district_id: districtId, include_pii: includePii }),
  meetings: (districtId?: string, includePii = false) =>
    downloadCsv("/api/reports/meetings.csv", "meetings-report.csv", { district_id: districtId, include_pii: includePii }),
};

// ─── Monthly trend ────────────────────────────────────────────────────────────

const MONTH_NAMES_UZ = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
];

function buildMonthRanges(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const monthsAgo = count - 1 - i;
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const last = new Date(yyyy, d.getMonth() + 1, 0).getDate();
    return {
      name: MONTH_NAMES_UZ[d.getMonth()],
      from: `${yyyy}-${mm}-01`,
      to:   `${yyyy}-${mm}-${String(last).padStart(2, "0")}`,
    };
  });
}

export function useMonthlyTrend(monthCount = 6) {
  const months = useMemo(() => buildMonthRanges(monthCount), [monthCount]);

  const youthQ = useQueries({
    queries: months.map((m) => ({
      queryKey: ["youth", "monthly", m.from, m.to],
      queryFn:  () =>
        api.get<Page<YouthRead>>("/api/youth", {
          query: { from: m.from, to: m.to, page: 1, limit: 1 },
        }),
    })),
  });

  const plansQ = useQueries({
    queries: months.map((m) => ({
      queryKey: ["plans", "monthly", m.from, m.to],
      queryFn:  () =>
        api.get<Page<PlanRead>>("/api/plans", {
          query: { from: m.from, to: m.to, page: 1, limit: 1 },
        }),
    })),
  });

  const meetingsQ = useQueries({
    queries: months.map((m) => ({
      queryKey: ["meetings", "monthly", m.from, m.to],
      queryFn:  () =>
        api.get<Page<MeetingRead>>("/api/meetings", {
          query: { from: m.from, to: m.to, page: 1, limit: 1 },
        }),
    })),
  });

  const isLoading =
    youthQ.some((q) => q.isLoading)    ||
    plansQ.some((q) => q.isLoading)    ||
    meetingsQ.some((q) => q.isLoading);

  const chartData = months.map((m, i) => ({
    name:         m.name,
    yoshlar:      youthQ[i].data?.total    ?? 0,
    rejalar:      plansQ[i].data?.total    ?? 0,
    uchrashuvlar: meetingsQ[i].data?.total ?? 0,
  }));

  return { chartData, isLoading };
}
