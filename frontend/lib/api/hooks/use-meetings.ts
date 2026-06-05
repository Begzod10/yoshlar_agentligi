import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type {
  CreateMeetingBody,
  MeetingsListParams,
  MeetingRead,
  UpdateAttendanceBody,
  UpdateMeetingBody,
} from "@/lib/api/models";
import type { Page } from "@/lib/api/types";
import { qk } from "@/lib/api/query-keys";

// ── Queries ───────────────────────────────────────────────────────────────────

export function useMeetingsList(params: MeetingsListParams = {}) {
  return useQuery({
    queryKey: qk.meetings.list(params),
    queryFn: () =>
      api.get<Page<MeetingRead>>("/api/meetings", {
        query: params as Record<string, string | number | undefined>,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: qk.meetings.detail(id),
    queryFn: () => api.get<MeetingRead>(`/api/meetings/${id}`),
    enabled: Boolean(id),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMeetingBody) => api.post<MeetingRead>("/api/meetings", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.meetings.lists() });
    },
  });
}

export function useUpdateMeeting(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeetingBody) => api.patch<MeetingRead>(`/api/meetings/${id}`, body),
    onSuccess: (updated) => {
      qc.setQueryData(qk.meetings.detail(id), updated);
      qc.invalidateQueries({ queryKey: qk.meetings.lists() });
    },
  });
}

export function useUpdateAttendance(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAttendanceBody) =>
      api.patch<MeetingRead>(`/api/meetings/${meetingId}/attendance`, body),
    onSuccess: (updated) => {
      qc.setQueryData(qk.meetings.detail(meetingId), updated);
      qc.invalidateQueries({ queryKey: qk.meetings.lists() });
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/meetings/${id}`),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.meetings.detail(id) });
      qc.invalidateQueries({ queryKey: qk.meetings.lists() });
    },
  });
}
