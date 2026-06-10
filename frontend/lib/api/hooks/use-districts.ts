import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { DistrictRead } from "@/lib/api/types";

export function useDistricts() {
  return useQuery({
    queryKey: ["districts"],
    queryFn: () => api.get<DistrictRead[]>("/api/districts"),
  });
}
