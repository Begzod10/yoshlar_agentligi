"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { LoginRequest, LoginResponse, User } from "@/lib/api/types";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/storage";

interface SessionContextValue {
  user: User | null;
  isLoading: boolean;
  login: (creds: LoginRequest) => Promise<User>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<User | null>({
    queryKey: ["session", "me"],
    queryFn: async () => {
      if (!getAccessToken()) return null;
      try {
        return await api.get<User>("/api/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.isUnauthorized) {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              const refreshed = await api.post<LoginResponse>("/api/auth/refresh", {
                refreshToken,
              });
              setTokens({
                access: refreshed.accessToken,
                refresh: refreshed.refreshToken,
              });
              return refreshed.user;
            } catch {
              clearTokens();
              return null;
            }
          }
          clearTokens();
          return null;
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMut = useMutation({
    mutationFn: async (creds: LoginRequest): Promise<User> => {
      const res = await api.post<LoginResponse>("/api/auth/login", creds);
      setTokens({ access: res.accessToken, refresh: res.refreshToken });
      return res.user;
    },
    onSuccess: (user) => {
      qc.setQueryData(["session", "me"], user);
    },
  });

  const logoutMut = useMutation({
    mutationFn: async () => {
      try {
        await api.post("/api/auth/logout");
      } catch {
        // logout must always clear local state
      } finally {
        clearTokens();
      }
    },
    onSettled: () => {
      qc.setQueryData(["session", "me"], null);
      qc.clear();
    },
  });

  const value: SessionContextValue = {
    user: data ?? null,
    isLoading,
    login: (creds) => loginMut.mutateAsync(creds),
    logout: () => logoutMut.mutateAsync(),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within <SessionProvider>");
  }
  return ctx;
}

export function useCurrentUser(): User | null {
  return useSession().user;
}
