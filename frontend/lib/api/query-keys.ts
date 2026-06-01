import type {
  YouthListParams,
  MasullarListParams,
  PlansListParams,
  MeetingsListParams,
  OrgsListParams,
} from "@/lib/api/models";

export const qk = {
  youth: {
    all: () => ["youth"] as const,
    lists: () => ["youth", "list"] as const,
    list: (params: YouthListParams) => ["youth", "list", params] as const,
    removals: (params?: { page?: number; limit?: number }) =>
      ["youth", "removals", params] as const,
    detail: (id: string) => ["youth", id] as const,
  },

  masullar: {
    all: () => ["masullar"] as const,
    lists: () => ["masullar", "list"] as const,
    list: (params: MasullarListParams) => ["masullar", "list", params] as const,
    detail: (id: string) => ["masullar", id] as const,
  },

  plans: {
    all: () => ["plans"] as const,
    lists: () => ["plans", "list"] as const,
    list: (params: PlansListParams) => ["plans", "list", params] as const,
    detail: (id: string) => ["plans", id] as const,
  },

  meetings: {
    all: () => ["meetings"] as const,
    lists: () => ["meetings", "list"] as const,
    list: (params: MeetingsListParams) => ["meetings", "list", params] as const,
    detail: (id: string) => ["meetings", id] as const,
  },

  organizations: {
    all: () => ["organizations"] as const,
    lists: () => ["organizations", "list"] as const,
    list: (params: OrgsListParams) => ["organizations", "list", params] as const,
    detail: (id: string) => ["organizations", id] as const,
  },
} as const;
