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
  full_name: string;
  role: UserRole;
  district_id: string | null;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: User;
}

export interface ApiErrorBody {
  success: false;
  data: null;
  error: { code: string; message: string };
}

export interface Page<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}
