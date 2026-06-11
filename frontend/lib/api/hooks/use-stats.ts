import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { StatsAgencyRead, StatsDistrictRead, StatsTrendPoint } from "@/lib/api/models";

// ── Query key factory (inline — stats never need cross-invalidation) ──────────

const statsKeys = {
  agency: (p: StatsDateRange) => ["stats", "agency", p] as const,
  districts: (p: StatsDistrictsParams) => ["stats", "districts", p] as const,
  compare: (p: StatsCompareParams) => ["stats", "compare", p] as const,
  trends: (p: StatsTrendsParams) => ["stats", "trends", p] as const,
};

// ── Param types ───────────────────────────────────────────────────────────────

interface StatsDateRange {
  from?: string;
  to?: string;
}

interface StatsDistrictsParams extends StatsDateRange {
  district_ids?: string;
}

interface StatsCompareParams extends StatsDateRange {
  a: string;
  b: string;
}

export type TrendMetric = "youthCount" | "planCompletion" | "meetingAttendance";
export type TrendGranularity = "month" | "week";
// Note: direktor.md and moderator.md both use month/week only — "day" is not a valid granularity.

interface StatsTrendsParams extends StatsDateRange {
  metric: TrendMetric;
  granularity?: TrendGranularity;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useStatsAgency(params: StatsDateRange = {}) {
  return useQuery({
    queryKey: statsKeys.agency(params),
    queryFn: () =>
      api.get<StatsAgencyRead>("/api/stats/agency", {
        query: params as Record<string, string | undefined>,
      }),
    staleTime: 60_000,
  });
}

export function useStatsDistricts(params: StatsDistrictsParams = {}) {
  return useQuery({
    queryKey: statsKeys.districts(params),
    queryFn: () =>
      api.get<StatsDistrictRead[]>("/api/stats/districts", {
        query: params as Record<string, string | undefined>,
      }),
    staleTime: 60_000,
  });
}

export function useStatsCompare(params: StatsCompareParams) {
  return useQuery({
    queryKey: statsKeys.compare(params),
    queryFn: () =>
      api.get<StatsDistrictRead[]>("/api/stats/compare", {
        query: params as unknown as Record<string, string | undefined>,
      }),
    enabled: Boolean(params.a && params.b),
    staleTime: 60_000,
  });
}

export function useStatsTrends(params: StatsTrendsParams) {
  return useQuery({
    queryKey: statsKeys.trends(params),
    queryFn: () =>
      api.get<StatsTrendPoint[]>("/api/stats/trends", {
        query: params as unknown as Record<string, string | undefined>,
      }),
    enabled: Boolean(params.metric),
    staleTime: 60_000,
  });
}
