import { api } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/storage";
import { config } from "@/lib/config";
import type {
  AgencyStats,
  AiInsight,
  AttendanceUpdate,
  CategoryStats,
  ChangePasswordRequest,
  DistrictRead,
  DistrictStatsRead,
  FlagCreate,
  FlagRead,
  FlagUpdate,
  LoginRequest,
  LoginResponse,
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
  NotificationPreferences,
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
  RejectRemoval,
  RevokeSessionsResponse,
  TopYouthStats,
  User,
  YouthCreate,
  YouthRead,
  YouthStatus,
  YouthUpdate,
} from "@/lib/api/types";
import type {
  AdminUserCreate,
  AdminUsersParams,
  AdminUserUpdate,
  ResetPasswordResponse,
} from "@/lib/api/hooks/use-admin-users";
import type {
  AuditLogParams,
  AuditLogRead,
  BackupRead,
  SystemInfo,
  TableCounts,
} from "@/lib/api/hooks/use-admin";

export * from "@/lib/api/hooks/use-admin";
export * from "@/lib/api/hooks/use-admin-users";
export * from "@/lib/api/hooks/use-core-api";
export * from "@/lib/api/hooks/use-districts";

export interface RefreshRequest {
  refreshToken: string;
}

export type AdminListParams = {
  page?: number;
  limit?: number;
  search?: string;
  districtId?: string;
  organizationId?: string;
  masulId?: string;
  youthId?: string;
  status?: string;
  from?: string;
  to?: string;
  entityType?: string;
  raisedBy?: string;
};

export type AdminDateRangeParams = {
  from?: string;
  to?: string;
};

export type AdminReportParams = AdminDateRangeParams & {
  districtId?: string;
  includePii?: boolean;
};

export type AdminTrendsParams = AdminDateRangeParams & {
  metric?: string;
  granularity?: "day" | "week" | "month" | "quarter" | "year" | string;
};

export type AdminCompareParams = AdminDateRangeParams & {
  a: string;
  b: string;
};

export type AdminBackupCreate = {
  label?: string;
};

export type AdminMaintenanceRequest = {
  enabled: boolean;
  message?: string | null;
};

export type AdminForceAssignMasulRequest = {
  masulId: string;
  overrideDistrict?: boolean;
};

export type AdminForceStatusRequest = {
  status: YouthStatus;
};

export type AdminBackupRestoreRequest = {
  confirm?: boolean;
};

export const ADMIN_SWAGGER_ENDPOINTS = [
  "POST /api/auth/login",
  "POST /api/auth/refresh",
  "POST /api/auth/logout",
  "GET /api/auth/me",
  "GET /api/districts",
  "GET /api/organizations",
  "POST /api/organizations",
  "GET /api/organizations/{org_id}",
  "PATCH /api/organizations/{org_id}",
  "DELETE /api/organizations/{org_id}",
  "GET /api/masullar",
  "POST /api/masullar",
  "GET /api/masullar/{masul_id}",
  "PATCH /api/masullar/{masul_id}",
  "DELETE /api/masullar/{masul_id}",
  "GET /api/youth",
  "POST /api/youth",
  "GET /api/youth/{youth_id}",
  "PATCH /api/youth/{youth_id}",
  "DELETE /api/youth/{youth_id}",
  "POST /api/youth/{youth_id}/assign-masul",
  "POST /api/youth/{youth_id}/status",
  "GET /api/plans",
  "POST /api/plans",
  "GET /api/plans/{plan_id}",
  "PATCH /api/plans/{plan_id}",
  "DELETE /api/plans/{plan_id}",
  "GET /api/meetings",
  "POST /api/meetings",
  "GET /api/meetings/{meeting_id}",
  "PATCH /api/meetings/{meeting_id}",
  "DELETE /api/meetings/{meeting_id}",
  "PATCH /api/meetings/{meeting_id}/attendance",
  "POST /api/youth/{youth_id}/propose-removal",
  "POST /api/youth/{youth_id}/approve-removal",
  "POST /api/youth/{youth_id}/reject-removal",
  "GET /api/removals",
  "GET /api/stats/agency",
  "GET /api/stats/districts",
  "GET /api/stats/compare",
  "GET /api/stats/trends",
  "GET /api/stats/categories",
  "GET /api/stats/top-yoshlar",
  "GET /api/stats/recent-activity",
  "GET /api/stats/ai-insights",
  "GET /api/monitoring/overview",
  "GET /api/monitoring/districts",
  "GET /api/monitoring/organizations",
  "GET /api/monitoring/masullar",
  "GET /api/reports/agency.csv",
  "GET /api/flags",
  "POST /api/flags",
  "PATCH /api/flags/{flag_id}",
  "GET /api/profile",
  "PATCH /api/profile",
  "POST /api/profile/change-password",
  "GET /api/profile/preferences",
  "PUT /api/profile/preferences",
  "GET /api/profile/notifications",
  "PUT /api/profile/notifications",
  "GET /api/profile/sessions",
  "DELETE /api/profile/sessions",
  "DELETE /api/profile/sessions/{session_id}",
  "GET /api/admin/users",
  "POST /api/admin/users",
  "GET /api/admin/users/{user_id}",
  "PATCH /api/admin/users/{user_id}",
  "DELETE /api/admin/users/{user_id}",
  "POST /api/admin/users/{user_id}/reset-password",
  "GET /api/admin/audit-log",
  "GET /api/admin/system/info",
  "GET /api/admin/system/counts",
  "POST /api/admin/system/maintenance",
  "POST /api/admin/youth/{youth_id}/force-assign-masul",
  "POST /api/admin/youth/{youth_id}/force-status",
  "POST /api/admin/youth/{youth_id}/restore",
  "GET /api/admin/reports/agency.csv",
  "GET /api/admin/reports/district/{district_id}.csv",
  "GET /api/admin/backups",
  "POST /api/admin/backups",
  "GET /api/admin/backups/{backup_id}",
  "DELETE /api/admin/backups/{backup_id}",
  "GET /api/admin/backups/{backup_id}/file",
  "POST /api/admin/backups/{backup_id}/restore",
] as const;

function csvUrl(path: string, query?: Record<string, string | number | boolean | undefined | null>) {
  const url = new URL(`${config.apiUrl}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function downloadCsv(
  path: string,
  filename: string,
  query?: Record<string, string | number | boolean | undefined | null>
) {
  const token = getAccessToken();
  const res = await fetch(csvUrl(path, query), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error?.message ?? payload?.detail ?? payload?.message ?? res.statusText);
  }

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export const adminApi = {
  auth: {
    login: (body: LoginRequest) => api.post<LoginResponse>("/api/auth/login", body),
    refresh: (body: RefreshRequest) => api.post<LoginResponse>("/api/auth/refresh", body),
    logout: () => api.post<void>("/api/auth/logout"),
    me: () => api.get<User>("/api/auth/me"),
  },
  districts: {
    list: () => api.get<DistrictRead[]>("/api/districts"),
  },
  organizations: {
    list: (params: AdminListParams = {}) =>
      api.get<Page<OrganizationRead>>("/api/organizations", {
        query: {
          districtId: params.districtId,
          search: params.search,
          page: params.page,
          limit: params.limit,
        },
      }),
    create: (body: OrganizationCreate) => api.post<OrganizationRead>("/api/organizations", body),
    get: (id: string) => api.get<OrganizationRead>(`/api/organizations/${id}`),
    update: (id: string, body: OrganizationUpdate) =>
      api.patch<OrganizationRead>(`/api/organizations/${id}`, body),
    delete: (id: string, confirm = true) =>
      api.delete<void>(`/api/organizations/${id}`, { query: { confirm } }),
  },
  masullar: {
    list: (params: AdminListParams = {}) =>
      api.get<Page<MasulRead>>("/api/masullar", {
        query: {
          districtId: params.districtId,
          organizationId: params.organizationId,
          search: params.search,
          page: params.page,
          limit: params.limit,
        },
      }),
    create: (body: MasulCreate) => api.post<MasulRead>("/api/masullar", body),
    get: (id: string) => api.get<MasulRead>(`/api/masullar/${id}`),
    update: (id: string, body: MasulUpdate) => api.patch<MasulRead>(`/api/masullar/${id}`, body),
    delete: (id: string) => api.delete<void>(`/api/masullar/${id}`),
  },
  youth: {
    list: (params: AdminListParams = {}) =>
      api.get<Page<YouthRead>>("/api/youth", {
        query: {
          districtId: params.districtId,
          masulId: params.masulId,
          status: params.status,
          search: params.search,
          page: params.page,
          limit: params.limit,
        },
      }),
    create: (body: YouthCreate) => api.post<YouthRead>("/api/youth", body),
    get: (id: string) => api.get<YouthRead>(`/api/youth/${id}`),
    update: (id: string, body: YouthUpdate) => api.patch<YouthRead>(`/api/youth/${id}`, body),
    delete: (id: string) => api.delete<void>(`/api/youth/${id}`),
    assignMasul: (youthId: string, masulId: string) =>
      api.post<YouthRead>(`/api/youth/${youthId}/assign-masul`, { masulId }),
    setStatus: (youthId: string, status: YouthStatus) =>
      api.post<YouthRead>(`/api/youth/${youthId}/status`, { status }),
    forceAssignMasul: (youthId: string, body: AdminForceAssignMasulRequest) =>
      api.post<YouthRead>(`/api/admin/youth/${youthId}/force-assign-masul`, body),
    forceStatus: (youthId: string, body: AdminForceStatusRequest) =>
      api.post<YouthRead>(`/api/admin/youth/${youthId}/force-status`, body),
    restore: (youthId: string) => api.post<YouthRead>(`/api/admin/youth/${youthId}/restore`),
  },
  plans: {
    list: (params: AdminListParams = {}) =>
      api.get<Page<PlanRead>>("/api/plans", {
        query: {
          youthId: params.youthId,
          status: params.status,
          page: params.page,
          limit: params.limit,
        },
      }),
    create: (body: PlanCreate) => api.post<PlanRead>("/api/plans", body),
    get: (id: string) => api.get<PlanRead>(`/api/plans/${id}`),
    update: (id: string, body: PlanUpdate) => api.patch<PlanRead>(`/api/plans/${id}`, body),
    delete: (id: string) => api.delete<void>(`/api/plans/${id}`),
  },
  meetings: {
    list: (params: AdminListParams = {}) =>
      api.get<Page<MeetingRead>>("/api/meetings", {
        query: {
          youthId: params.youthId,
          from: params.from,
          to: params.to,
          page: params.page,
          limit: params.limit,
        },
      }),
    create: (body: MeetingCreate) => api.post<MeetingRead>("/api/meetings", body),
    get: (id: string) => api.get<MeetingRead>(`/api/meetings/${id}`),
    update: (id: string, body: MeetingUpdate) => api.patch<MeetingRead>(`/api/meetings/${id}`, body),
    delete: (id: string) => api.delete<void>(`/api/meetings/${id}`),
    attendance: (id: string, body: AttendanceUpdate) =>
      api.patch<MeetingRead>(`/api/meetings/${id}/attendance`, body),
  },
  removals: {
    propose: (youthId: string, body: ProposeRemoval) =>
      api.post<YouthRead>(`/api/youth/${youthId}/propose-removal`, body),
    approve: (youthId: string) => api.post<YouthRead>(`/api/youth/${youthId}/approve-removal`),
    reject: (youthId: string, body: RejectRemoval) =>
      api.post<YouthRead>(`/api/youth/${youthId}/reject-removal`, body),
    list: () => api.get<PendingRemovalRead[]>("/api/removals"),
  },
  stats: {
    agency: (params: AdminDateRangeParams = {}) =>
      api.get<AgencyStats>("/api/stats/agency", { query: params }),
    districts: (params: AdminDateRangeParams & { districtIds?: string } = {}) =>
      api.get<DistrictStatsRead[]>("/api/stats/districts", { query: params }),
    compare: (params: AdminCompareParams) =>
      api.get<Record<string, unknown>>("/api/stats/compare", { query: params }),
    trends: (params: AdminTrendsParams = {}) =>
      api.get<Record<string, unknown>>("/api/stats/trends", { query: params }),
    categories: () => api.get<CategoryStats[]>("/api/stats/categories"),
    topYoshlar: (limit = 10) => api.get<TopYouthStats[]>("/api/stats/top-yoshlar", { query: { limit } }),
    recentActivity: (limit = 20) =>
      api.get<RecentActivity[]>("/api/stats/recent-activity", { query: { limit } }),
    aiInsights: () => api.get<AiInsight[]>("/api/stats/ai-insights"),
  },
  monitoring: {
    overview: (period: MonitoringPeriod = "month") =>
      api.get<MonitoringOverview>("/api/monitoring/overview", { query: { period } }),
    districts: (period: MonitoringPeriod = "month") =>
      api.get<MonitoringDistrict[]>("/api/monitoring/districts", { query: { period } }),
    organizations: (period: MonitoringPeriod = "month") =>
      api.get<MonitoringOrganization[]>("/api/monitoring/organizations", { query: { period } }),
    masullar: (period: MonitoringPeriod = "month") =>
      api.get<MonitoringMasul[]>("/api/monitoring/masullar", { query: { period } }),
  },
  reports: {
    agency: (params: AdminReportParams = {}) =>
      downloadCsv("/api/reports/agency.csv", "agency-report.csv", {
        from: params.from,
        to: params.to,
        include_pii: params.includePii,
      }),
    adminAgency: (params: AdminReportParams = {}) =>
      downloadCsv("/api/admin/reports/agency.csv", "admin-agency-report.csv", {
        from: params.from,
        to: params.to,
        include_pii: params.includePii,
      }),
    adminDistrict: (districtId: string, params: AdminReportParams = {}) =>
      downloadCsv(
        `/api/admin/reports/district/${encodeURIComponent(districtId)}.csv`,
        `admin-${districtId}-report.csv`,
        {
          from: params.from,
          to: params.to,
          include_pii: params.includePii,
        }
      ),
  },
  flags: {
    list: (params: AdminListParams = {}) =>
      api.get<Page<FlagRead>>("/api/flags", {
        query: {
          status: params.status,
          entityType: params.entityType,
          raisedBy: params.raisedBy,
          page: params.page,
          limit: params.limit,
        },
      }),
    create: (body: FlagCreate) => api.post<FlagRead>("/api/flags", body),
    update: (id: string, body: FlagUpdate) => api.patch<FlagRead>(`/api/flags/${id}`, body),
  },
  profile: {
    get: () => api.get<ProfileRead>("/api/profile"),
    update: (body: ProfileUpdate) => api.patch<ProfileRead>("/api/profile", body),
    changePassword: (body: ChangePasswordRequest) => api.post<void>("/api/profile/change-password", body),
    preferences: () => api.get<ProfilePreferences>("/api/profile/preferences"),
    updatePreferences: (body: ProfilePreferencesUpdate) =>
      api.put<ProfilePreferences>("/api/profile/preferences", body),
    notifications: () => api.get<NotificationPreferences>("/api/profile/notifications"),
    updateNotifications: (body: NotificationPreferences) =>
      api.put<NotificationPreferences>("/api/profile/notifications", body),
    sessions: () => api.get<ProfileSession[]>("/api/profile/sessions"),
    revokeOtherSessions: () => api.delete<RevokeSessionsResponse>("/api/profile/sessions"),
    revokeSession: (sessionId: string) => api.delete<void>(`/api/profile/sessions/${sessionId}`),
  },
  users: {
    list: (params: AdminUsersParams = {}) =>
      api.get<Page<User>>("/api/admin/users", {
        query: {
          role: params.role,
          districtId: params.districtId,
          search: params.search,
          page: params.page,
          limit: params.limit,
        },
      }),
    create: (body: AdminUserCreate) => api.post<User>("/api/admin/users", body),
    get: (id: string) => api.get<User>(`/api/admin/users/${id}`),
    update: (id: string, body: AdminUserUpdate) => api.patch<User>(`/api/admin/users/${id}`, body),
    delete: (id: string) => api.delete<void>(`/api/admin/users/${id}`),
    resetPassword: (id: string) =>
      api.post<ResetPasswordResponse>(`/api/admin/users/${id}/reset-password`),
  },
  audit: {
    list: (params: AuditLogParams = {}) =>
      api.get<Page<AuditLogRead>>("/api/admin/audit-log", {
        query: {
          actor: params.actor,
          action: params.action,
          entityType: params.entityType,
          from: params.from,
          to: params.to,
          page: params.page,
          limit: params.limit,
        },
      }),
  },
  system: {
    info: () => api.get<SystemInfo>("/api/admin/system/info"),
    counts: () => api.get<TableCounts>("/api/admin/system/counts"),
    maintenance: (body: AdminMaintenanceRequest) =>
      api.post<SystemInfo>("/api/admin/system/maintenance", body),
  },
  backups: {
    list: () => api.get<BackupRead[]>("/api/admin/backups"),
    create: (body?: AdminBackupCreate) => api.post<BackupRead>("/api/admin/backups", body),
    get: (id: string) => api.get<BackupRead>(`/api/admin/backups/${id}`),
    delete: (id: string) => api.delete<void>(`/api/admin/backups/${id}`),
    download: (id: string) => downloadCsv(`/api/admin/backups/${id}/file`, `backup-${id}.zip`),
    restore: (id: string, body: AdminBackupRestoreRequest = { confirm: true }) =>
      api.post<void>(`/api/admin/backups/${id}/restore`, body),
  },
};

export type AdminApi = typeof adminApi;
