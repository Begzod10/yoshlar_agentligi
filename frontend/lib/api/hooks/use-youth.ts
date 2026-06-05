import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  AssignMasulBody,
  AssignMasulParams,
  CreateYouthBody,
  ProposeRemovalBody,
  RejectRemovalBody,
  UpdateYouthBody,
  UpdateYouthStatusBody,
  YouthListParams,
  YouthRead,
} from "@/lib/api/models";
import type { Page } from "@/lib/api/types";
import { qk } from "@/lib/api/query-keys";

// ── Queries ───────────────────────────────────────────────────────────────────

export function useYouthList(params: YouthListParams = {}) {
  return useQuery({
    queryKey: qk.youth.list(params),
    queryFn: () =>
      api.get<Page<YouthRead>>("/api/youth", {
        query: params as Record<string, string | number | undefined>,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useYouth(id: string) {
  return useQuery({
    queryKey: qk.youth.detail(id),
    queryFn: () => api.get<YouthRead>(`/api/youth/${id}`),
    enabled: Boolean(id),
  });
}

export function useYouthRemovals(params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: qk.youth.removals(params),
    queryFn: () =>
      api.get<Page<YouthRead>>("/api/youth/removals", {
        query: params as Record<string, number | undefined>,
      }),
    placeholderData: keepPreviousData,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateYouth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateYouthBody) => api.post<YouthRead>("/api/youth", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.youth.lists() });
    },
  });
}

export function useUpdateYouth(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateYouthBody) => api.patch<YouthRead>(`/api/youth/${id}`, body),
    onSuccess: (updated) => {
      qc.setQueryData(qk.youth.detail(id), updated);
      qc.invalidateQueries({ queryKey: qk.youth.lists() });
    },
  });
}

export function useDeleteYouth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/youth/${id}`),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.youth.detail(id) });
      qc.invalidateQueries({ queryKey: qk.youth.lists() });
    },
  });
}

export function useAssignMasul(youthId: string, params: AssignMasulParams = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignMasulBody) =>
      api.post<YouthRead>(`/api/youth/${youthId}/assign-masul`, body, {
        query: params as Record<string, boolean | undefined>,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(qk.youth.detail(youthId), updated);
      qc.invalidateQueries({ queryKey: qk.youth.lists() });
    },
  });
}

export function useUpdateYouthStatus(youthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateYouthStatusBody) =>
      api.post<YouthRead>(`/api/youth/${youthId}/status`, body),
    onSuccess: (updated) => {
      qc.setQueryData(qk.youth.detail(youthId), updated);
      qc.invalidateQueries({ queryKey: qk.youth.lists() });
    },
  });
}

export function useProposeRemoval(youthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProposeRemovalBody) =>
      api.post<YouthRead>(`/api/youth/${youthId}/propose-removal`, body),
    onSuccess: (updated) => {
      qc.setQueryData(qk.youth.detail(youthId), updated);
      qc.invalidateQueries({ queryKey: qk.youth.lists() });
    },
  });
}

export function useApproveRemoval(youthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<YouthRead>(`/api/youth/${youthId}/approve-removal`, {}),
    onSuccess: (updated) => {
      qc.setQueryData(qk.youth.detail(youthId), updated);
      qc.invalidateQueries({ queryKey: qk.youth.lists() });
      qc.invalidateQueries({ queryKey: qk.youth.removals() });
    },
  });
}

export function useRejectRemoval(youthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RejectRemovalBody) =>
      api.post<YouthRead>(`/api/youth/${youthId}/reject-removal`, body),
    onSuccess: (updated) => {
      qc.setQueryData(qk.youth.detail(youthId), updated);
      qc.invalidateQueries({ queryKey: qk.youth.lists() });
      qc.invalidateQueries({ queryKey: qk.youth.removals() });
    },
  });
}
