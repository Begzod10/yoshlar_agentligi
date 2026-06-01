import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { Page, User, UserRole } from "@/lib/api/types";

export interface AdminUsersParams {
  role?: UserRole;
  districtId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminUserCreate {
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
  districtId?: string | null;
  phone?: string | null;
}

export interface AdminUserUpdate {
  fullName?: string;
  phone?: string | null;
  isActive?: boolean;
}

export interface ResetPasswordResponse {
  password: string;
}

function usersQueryKey(params: AdminUsersParams) {
  return ["admin", "users", params] as const;
}

export function useAdminUsers(params: AdminUsersParams = {}) {
  return useQuery({
    queryKey: usersQueryKey(params),
    queryFn: () =>
      api.get<Page<User>>("/api/admin/users", {
        query: {
          role: params.role,
          district_id: params.districtId,
          search: params.search,
          page: params.page ?? 1,
          limit: params.limit ?? 50,
        },
      }),
    retry: false,
  });
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => api.get<User>(`/api/admin/users/${id}`),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: AdminUserCreate) => api.post<User>("/api/admin/users", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminUserUpdate }) =>
      api.patch<User>(`/api/admin/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["session", "me"] });
    },
  });
}

export function useDeleteAdminUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useResetAdminUserPassword() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ResetPasswordResponse>(`/api/admin/users/${id}/reset-password`),
  });
}
