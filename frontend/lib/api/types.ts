// Keep in sync with backend/app/core/constants.py and backend/app/modules/users/schemas.py.
// Source of truth lives in backend; this file mirrors it for FE typing.

export type UserRole =
  | "admin"
  | "direktor"
  | "tashkilot_direktori"
  | "masul_hodim"
  | "moderator";

export const USER_ROLES: readonly UserRole[] = [
  "admin",
  "direktor",
  "tashkilot_direktori",
  "masul_hodim",
  "moderator",
] as const;

export const DISTRICT_SCOPED_ROLES: readonly UserRole[] = [
  "tashkilot_direktori",
  "masul_hodim",
] as const;

export const CROSS_DISTRICT_ROLES: readonly UserRole[] = [
  "admin",
  "direktor",
  "moderator",
] as const;

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  districtId: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "bearer";
  user: User;
}

export interface ApiErrorBody {
  success: false;
  data: null;
  error: { code: string; message: string };
}

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DistrictRead {
  id: string;
  name: string;
}

export interface OrganizationRead {
  id: string;
  name: string;
  districtId: string;
  type: string | null;
  contactPhone: string | null;
  address: string | null;
  headName: string | null;
  createdAt: string;
}

export type OrganizationCreate = Pick<OrganizationRead, "name" | "districtId"> &
  Partial<Pick<OrganizationRead, "type" | "contactPhone" | "address" | "headName">>;

export type OrganizationUpdate = Partial<OrganizationCreate>;

export interface MasulRead {
  id: string;
  fullName: string;
  districtId: string;
  organizationId: string | null;
  phone: string | null;
  position: string | null;
  createdAt: string;
}

export type MasulCreate = Pick<MasulRead, "fullName" | "districtId"> &
  Partial<Pick<MasulRead, "organizationId" | "phone" | "position">>;

export type MasulUpdate = Partial<Omit<MasulCreate, "districtId">>;

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

export type YouthCreate = Pick<YouthRead, "fullName" | "districtId"> &
  Partial<Pick<YouthRead, "masulId" | "organizationId" | "contact" | "dateOfBirth" | "address" | "notes">>;

export type YouthUpdate = Partial<Omit<YouthCreate, "districtId">>;

export interface Milestone {
  title: string;
  done?: boolean;
  dueDate?: string | null;
  notes?: string | null;
}

export type PlanStatus = "draft" | "in_progress" | "completed" | "cancelled";

export interface PlanRead {
  id: string;
  youthId: string;
  masulId: string | null;
  title: string;
  goal: string | null;
  milestones: Record<string, unknown>[];
  status: PlanStatus;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface PlanCreate {
  youthId: string;
  title: string;
  goal?: string | null;
  milestones?: Milestone[];
  startDate?: string | null;
  endDate?: string | null;
}

export type PlanUpdate = Partial<Omit<PlanCreate, "youthId"> & {
  status: PlanStatus | null;
  progress: number | null;
}>;

export type MeetingAttendance = "scheduled" | "attended" | "no_show" | "rescheduled";

export interface MeetingRead {
  id: string;
  youthId: string;
  masulId: string | null;
  scheduledAt: string;
  type: string | null;
  location: string | null;
  agenda: string | null;
  attendanceStatus: MeetingAttendance;
  attendanceNotes: string | null;
  attachments: Record<string, unknown>[];
  createdAt: string;
}

export interface MeetingCreate {
  youthId: string;
  scheduledAt: string;
  type?: string | null;
  location?: string | null;
  agenda?: string | null;
}

export type MeetingUpdate = Partial<MeetingCreate>;

export interface AttendanceUpdate {
  attendanceStatus: MeetingAttendance;
  attendanceNotes?: string | null;
}

export interface PendingRemovalRead {
  youthId: string;
  fullName: string;
  districtId: string;
  proposal: Record<string, unknown>;
}

export interface ProposeRemoval {
  reason: string;
}

export interface RejectRemoval {
  comment: string;
}

export type FlagCategory = "data_quality" | "suspected_fraud" | "safeguarding" | "other";
export type FlagStatus = "open" | "resolved" | "dismissed";

export interface FlagRead {
  id: string;
  raisedBy: string;
  role: string;
  entityType: string;
  entityId: string;
  category: string;
  comment: string;
  status: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
}

export interface FlagCreate {
  entityType: string;
  entityId: string;
  category: FlagCategory;
  comment: string;
}

export interface FlagUpdate {
  status: FlagStatus;
  resolution?: string | null;
}

export interface AgencyStats {
  totalYouth: number;
  activeYouth: number;
  graduatedYouth: number;
  removedYouth: number;
  totalPlans: number;
  completedPlans: number;
  totalMeetings: number;
  attendedMeetings: number;
  totalDistricts: number;
  totalOrganizations: number;
  totalMasullar: number;
}

export interface DistrictStatsRead {
  districtId: string;
  totalYouth: number;
  activeYouth: number;
  graduatedYouth: number;
  removedYouth: number;
  totalPlans: number;
  completedPlans?: number;
  totalMeetings: number;
  attendedMeetings?: number;
}
