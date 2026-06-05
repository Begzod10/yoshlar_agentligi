import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";

export interface DistrictsResponse {
  data: string[];
}

export function useDistricts() {
  return useQuery({
    queryKey: ["districts"],
    queryFn: () => api.get<DistrictsResponse>("/api/districts"),
    select: (res) => res.data,
  });
}