"use client";

import { createContext, useContext } from "react";
import type React from "react";

import type {
  IndividualPlan,
  Masul,
  Meeting,
  Organization,
  Youth,
} from "@/lib/types";

export type PageResource = "organizations" | "masullar" | "youth" | "plans" | "meetings";

export interface PageResourceParams {
  page?: number;
  limit?: number;
  search?: string;
  districtId?: string;
  organizationId?: string;
  masulId?: string;
  youthId?: string;
  status?: string;
  from?: string;
  to?: string;
}

export type PageResourceParamsMap = Partial<Record<PageResource, PageResourceParams>>;

export interface PagePaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PageDataContextValue {
  resources: readonly PageResource[];
  isLoading: boolean;
  pagination: Partial<Record<PageResource, PagePaginationState>>;
  setResourceParams: (resource: PageResource, params: PageResourceParams) => void;
  setResourcePage: (resource: PageResource, page: number) => void;
  organizations?: Organization[];
  setOrganizations?: React.Dispatch<React.SetStateAction<Organization[]>>;
  masullar?: Masul[];
  setMasullar?: React.Dispatch<React.SetStateAction<Masul[]>>;
  youth?: Youth[];
  setYouth?: React.Dispatch<React.SetStateAction<Youth[]>>;
  removedYouth?: Youth[];
  setRemovedYouth?: React.Dispatch<React.SetStateAction<Youth[]>>;
  plans?: IndividualPlan[];
  setPlans?: React.Dispatch<React.SetStateAction<IndividualPlan[]>>;
  meetings?: Meeting[];
  setMeetings?: React.Dispatch<React.SetStateAction<Meeting[]>>;
}

export const PageDataContext = createContext<PageDataContextValue | null>(null);

export function usePageDataContext() {
  return useContext(PageDataContext);
}
