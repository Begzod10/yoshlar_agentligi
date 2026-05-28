// Domain models — mirror of backend schemas.
// Source of truth: direktor-frontend-api.md / moderator-frontend-api.md

export interface RemovalProposal {
  proposed_by: string;
  reason: string;
  proposed_at: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_comment?: string;
}

export interface YouthRead {
  id: string;
  full_name: string;
  birth_date: string | null;
  district_id: string;
  masul_id: string | null;
  organization_id: string | null;
  status: "active" | "graduated" | "removed";
  category: string | null;
  contact: string | null;
  notes: Record<string, unknown> | null;
  removal_proposal: RemovalProposal | null;
  created_at: string;
  updated_at: string;
}

export interface MasulRead {
  id: string;
  full_name: string;
  district_id: string;
  organization_id: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanRead {
  id: string;
  youth_id: string;
  masul_id: string;
  title: string;
  goal: string | null;
  milestones: unknown[] | null;
  status: "draft" | "in_progress" | "completed" | "cancelled";
  progress: number;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingRead {
  id: string;
  youth_id: string;
  masul_id: string;
  scheduled_at: string;
  type: string | null;
  location: string | null;
  agenda: string | null;
  attendance_status: "scheduled" | "attended" | "no_show" | "rescheduled";
  attendance_notes: string | null;
  attachments: unknown[] | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationRead {
  id: string;
  name: string;
  district_id: string;
  type: string | null;
  contact_phone: string | null;
  address: string | null;
  director_name: string;
  created_at: string;
  updated_at: string;
}

// ── Stats models ─────────────────────────────────────────────────────────────

export interface StatsAgencyRead {
  total_youth: number;
  active_youth: number;
  graduated_youth: number;
  removed_youth: number;
  total_organizations: number;
  total_masullar: number;
  total_plans: number;
  completed_plans: number;
  in_progress_plans: number;
  total_meetings: number;
  attended_meetings: number;
}

export interface StatsDistrictRead {
  district_id: string;
  total_youth: number;
  active_youth: number;
  graduated_youth: number;
  total_organizations: number;
  total_masullar: number;
  total_plans: number;
  completed_plans: number;
  total_meetings: number;
  completion_rate: number;
}

export interface StatsTrendPoint {
  period: string;
  value: number;
}

// ── Request body types ────────────────────────────────────────────────────────

export interface CreateYouthBody {
  full_name: string;
  birth_date?: string;
  district_id: string;
  masul_id?: string;
  organization_id?: string;
  category?: string;
  contact?: string;
  notes?: Record<string, unknown>;
}

export interface UpdateYouthBody {
  full_name?: string;
  birth_date?: string;
  category?: string;
  contact?: string;
  notes?: Record<string, unknown>;
  organization_id?: string;
}

export interface UpdateYouthStatusBody {
  status: "active" | "graduated" | "removed";
  reason?: string;
}

export interface AssignMasulBody {
  masul_id: string;
}

// override is a query param (?override=true), not a body field
export interface AssignMasulParams {
  override?: boolean;
}

export interface ProposeRemovalBody {
  reason: string;
}

export interface RejectRemovalBody {
  comment: string;
}

export interface CreateMasulBody {
  full_name: string;
  district_id: string;
  organization_id: string;
  phone?: string;
  email?: string;
}

export interface UpdateMasulBody {
  full_name?: string;
  phone?: string;
  email?: string;
}

export interface CreatePlanBody {
  youth_id: string;
  masul_id: string;
  title: string;
  goal?: string;
  milestones?: unknown[];
  status?: "draft" | "in_progress" | "completed" | "cancelled";
  start_date: string;
  end_date: string;
}

export interface UpdatePlanBody {
  title?: string;
  goal?: string;
  milestones?: unknown[];
  status?: "draft" | "in_progress" | "completed" | "cancelled";
  progress?: number;
  end_date?: string;
}

export interface CreateMeetingBody {
  youth_id: string;
  masul_id: string;
  scheduled_at: string;
  type?: string;
  location?: string;
  agenda?: string;
}

export interface UpdateMeetingBody {
  scheduled_at?: string;
  type?: string;
  location?: string;
  agenda?: string;
}

export interface UpdateAttendanceBody {
  attendance_status: "scheduled" | "attended" | "no_show" | "rescheduled";
  attendance_notes?: string;
}

export interface CreateOrganizationBody {
  name: string;
  district_id: string;
  director_name: string;
  type?: string;
  contact_phone?: string;
  address?: string;
}

export interface UpdateOrganizationBody {
  name?: string;
  type?: string;
  contact_phone?: string;
  address?: string;
  director_name?: string;
}

// ── List filter params ────────────────────────────────────────────────────────

export interface YouthListParams {
  district_id?: string;
  status?: "active" | "graduated" | "removed";
  search?: string;
  page?: number;
  limit?: number;
}

export interface MasullarListParams {
  district_id?: string;
  organization_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PlansListParams {
  youth_id?: string;
  status?: "draft" | "in_progress" | "completed" | "cancelled";
  district_id?: string;
  page?: number;
  limit?: number;
}

export interface MeetingsListParams {
  youth_id?: string;
  district_id?: string;
  page?: number;
  limit?: number;
}

export interface OrgsListParams {
  district_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}
