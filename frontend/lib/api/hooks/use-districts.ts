import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";

interface DistrictsResponse {
  data: string[];
}

export function useDistricts() {
  return useQuery({
    queryKey: ["districts"],
    queryFn: () => api.get<DistrictsResponse>("/api/districts"),
    staleTime: Infinity,
    select: (res) => res.data,
  });
}
