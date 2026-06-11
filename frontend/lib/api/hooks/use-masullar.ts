import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  CreateMasulBody,
  MasullarListParams,
  MasulRead,
  UpdateMasulBody,
} from "@/lib/api/models";
import type { Page } from "@/lib/api/types";
import { qk } from "@/lib/api/query-keys";

// ── Queries ───────────────────────────────────────────────────────────────────

export function useMasullarList(params: MasullarListParams = {}) {
  return useQuery({
    queryKey: qk.masullar.list(params),
    queryFn: () =>
      api.get<Page<MasulRead>>("/api/masullar", {
        query: params as Record<string, string | number | undefined>,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useMasul(id: string) {
  return useQuery({
    queryKey: qk.masullar.detail(id),
    queryFn: () => api.get<MasulRead>(`/api/masullar/${id}`),
    enabled: Boolean(id),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateMasul() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMasulBody) => api.post<MasulRead>("/api/masullar", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.masullar.lists() });
    },
  });
}

export function useUpdateMasul(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMasulBody) => api.patch<MasulRead>(`/api/masullar/${id}`, body),
    onSuccess: (updated) => {
      qc.setQueryData(qk.masullar.detail(id), updated);
      qc.invalidateQueries({ queryKey: qk.masullar.lists() });
    },
  });
}

export function useDeleteMasul() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/masullar/${id}`),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.masullar.detail(id) });
      qc.invalidateQueries({ queryKey: qk.masullar.lists() });
    },
  });
}
