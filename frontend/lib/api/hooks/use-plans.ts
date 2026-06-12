import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  CreatePlanBody,
  PlansListParams,
  PlanRead,
  UpdatePlanBody,
} from "@/lib/api/models";
import type { Page } from "@/lib/api/types";
import { qk } from "@/lib/api/query-keys";

// ── Queries ───────────────────────────────────────────────────────────────────

export function usePlansList(params: PlansListParams = {}) {
  return useQuery({
    queryKey: qk.plans.list(params),
    queryFn: () =>
      api.get<Page<PlanRead>>("/api/plans", {
        query: params as Record<string, string | number | undefined>,
      }),
    placeholderData: keepPreviousData,
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: qk.plans.detail(id),
    queryFn: () => api.get<PlanRead>(`/api/plans/${id}`),
    enabled: Boolean(id),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePlanBody) => api.post<PlanRead>("/api/plans", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plans.lists() });
    },
  });
}

export function useUpdatePlan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePlanBody) => api.patch<PlanRead>(`/api/plans/${id}`, body),
    onSuccess: (updated) => {
      qc.setQueryData(qk.plans.detail(id), updated);
      qc.invalidateQueries({ queryKey: qk.plans.lists() });
    },
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/plans/${id}`),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.plans.detail(id) });
      qc.invalidateQueries({ queryKey: qk.plans.lists() });
    },
  });
}
