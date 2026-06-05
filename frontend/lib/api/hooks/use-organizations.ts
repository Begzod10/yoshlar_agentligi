import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  CreateOrganizationBody,
  OrganizationRead,
  OrgsListParams,
  UpdateOrganizationBody,
} from "@/lib/api/models";
import type { Page } from "@/lib/api/types";
import { qk } from "@/lib/api/query-keys";

// ── Queries ───────────────────────────────────────────────────────────────────

export function useOrganizationsList(params: OrgsListParams = {}) {
  return useQuery({
    queryKey: qk.organizations.list(params),
    queryFn: () =>
      api.get<Page<OrganizationRead>>("/api/organizations"),
    placeholderData: keepPreviousData,
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: qk.organizations.detail(id),
    queryFn: () => api.get<OrganizationRead>(`/api/organizations/${id}`),
    enabled: Boolean(id),
  });
}

// ── Mutations (admin/direktor only) ───────────────────────────────────────────

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrganizationBody) =>
      api.post<OrganizationRead>("/api/organizations", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.organizations.lists() });
    },
  });
}

export function useUpdateOrganization(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateOrganizationBody) =>
      api.patch<OrganizationRead>(`/api/organizations/${id}`, body),
    onSuccess: (updated) => {
      qc.setQueryData(qk.organizations.detail(id), updated);
      qc.invalidateQueries({ queryKey: qk.organizations.lists() });
    },
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/organizations/${id}`),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.organizations.detail(id) });
      qc.invalidateQueries({ queryKey: qk.organizations.lists() });
    },
  });
}
