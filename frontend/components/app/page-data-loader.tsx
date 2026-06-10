"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { keepPreviousData, useQueries } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import {
  masulToApp,
  meetingToApp,
  organizationToApp,
  planToApp,
  useApp,
  youthToApp,
} from "@/lib/app-context";
import type { MasulRead, MeetingRead, OrganizationRead, Page, PlanRead, YouthRead } from "@/lib/api/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageDataContext,
  type PageResource,
  type PageResourceParams,
  type PageResourceParamsMap,
  type PagePaginationState,
} from "@/lib/page-data-context";
import type { IndividualPlan, Masul, Meeting, Organization, Youth } from "@/lib/types";

interface PageDataLoaderProps {
  children: ReactNode;
  initialParams?: PageResourceParamsMap;
  resources: readonly PageResource[];
}

function PageLoader() {
  const skeletonClassName = "border border-gray-300 bg-gray-200 dark:border-gray-700 dark:bg-gray-800";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className={`h-8 w-64 ${skeletonClassName}`} />
        <Skeleton className={`h-4 w-96 max-w-full ${skeletonClassName}`} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className={`h-28 ${skeletonClassName}`} />
        <Skeleton className={`h-28 ${skeletonClassName}`} />
        <Skeleton className={`h-28 ${skeletonClassName}`} />
      </div>
      <Skeleton className={`h-[420px] w-full ${skeletonClassName}`} />
    </div>
  );
}

function resourceQuery(resource: PageResource, params: PageResourceParams, enabled: boolean) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;

  switch (resource) {
    case "organizations":
      return {
        queryKey: ["organizations", { ...params, page, limit }],
        enabled,
        placeholderData: keepPreviousData,
        queryFn: () =>
          api.get<Page<OrganizationRead>>("/api/organizations", {
            query: {
              district_id: params.districtId,
              search: params.search,
              page,
              limit,
            },
          }),
      };
    case "masullar":
      return {
        queryKey: ["masullar", { ...params, page, limit }],
        enabled,
        placeholderData: keepPreviousData,
        queryFn: () =>
          api.get<Page<MasulRead>>("/api/masullar", {
            query: {
              district_id: params.districtId,
              organization_id: params.organizationId,
              search: params.search,
              page,
              limit,
            },
          }),
      };
    case "youth":
      return {
        queryKey: ["youth", { ...params, page, limit }],
        enabled,
        placeholderData: keepPreviousData,
        queryFn: () =>
          api.get<Page<YouthRead>>("/api/youth", {
            query: {
              district_id: params.districtId,
              masul_id: params.masulId,
              status: params.status,
              search: params.search,
              page,
              limit,
            },
          }),
      };
    case "plans":
      return {
        queryKey: ["plans", { ...params, page, limit }],
        enabled,
        placeholderData: keepPreviousData,
        queryFn: () =>
          api.get<Page<PlanRead>>("/api/plans", {
            query: {
              youth_id: params.youthId,
              status: params.status,
              page,
              limit,
            },
          }),
      };
    case "meetings":
      return {
        queryKey: ["meetings", { ...params, page, limit }],
        enabled,
        placeholderData: keepPreviousData,
        queryFn: () =>
          api.get<Page<MeetingRead>>("/api/meetings", {
            query: {
              youth_id: params.youthId,
              from: params.from,
              to: params.to,
              page,
              limit,
            },
          }),
      };
  }
}

function pageToPagination<T>(page?: Page<T>): PagePaginationState {
  const currentPage = page?.page ?? 1;
  const limit = page?.limit ?? 50;
  const total = page?.total ?? 0;

  return {
    page: currentPage,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function PageDataLoader({ children, initialParams = {}, resources }: PageDataLoaderProps) {
  const { currentUser } = useApp();
  const [resourceParams, setResourceParamsState] = useState<PageResourceParamsMap>(initialParams);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [masullar, setMasullar] = useState<Masul[]>([]);
  const [youth, setYouth] = useState<Youth[]>([]);
  const [removedYouth, setRemovedYouth] = useState<Youth[]>([]);
  const [plans, setPlans] = useState<IndividualPlan[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const setResourceParams = useCallback((resource: PageResource, params: PageResourceParams) => {
    setResourceParamsState((current) => {
      const previous = current[resource] ?? {};
      const normalized = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
      ) as PageResourceParams;
      const next = {
        ...normalized,
        page: params.page ?? 1,
        limit: params.limit ?? previous.limit ?? 50,
      };
      if (JSON.stringify(previous) === JSON.stringify(next)) return current;
      return { ...current, [resource]: next };
    });
  }, []);

  const setResourcePage = useCallback((resource: PageResource, page: number) => {
    setResourceParamsState((current) => {
      const previous = current[resource] ?? {};
      const nextPage = Math.max(1, page);
      if ((previous.page ?? 1) === nextPage) return current;
      return {
        ...current,
        [resource]: {
          ...previous,
          page: nextPage,
          limit: previous.limit ?? 50,
        },
      };
    });
  }, []);

  const enabled = Boolean(currentUser);
  const activeResources = useMemo(() => [...resources], [resources]);
  const queryResults = useQueries({
    queries: activeResources.map((resource) =>
      resourceQuery(resource, resourceParams[resource] ?? {}, enabled)
    ),
  });

  const getQueryData = <T,>(resource: PageResource): Page<T> | undefined => {
    const index = activeResources.indexOf(resource);
    return index >= 0 ? (queryResults[index]?.data as Page<T> | undefined) : undefined;
  };
  const organizationsPage = getQueryData<OrganizationRead>("organizations");
  const masullarsPage = getQueryData<MasulRead>("masullar");
  const youthPage = getQueryData<YouthRead>("youth");
  const plansPage = getQueryData<PlanRead>("plans");
  const meetingsPage = getQueryData<MeetingRead>("meetings");

  useEffect(() => {
    if (organizationsPage) {
      setOrganizations(organizationsPage.data.map(organizationToApp));
    }
  }, [organizationsPage]);

  useEffect(() => {
    if (masullarsPage) {
      setMasullar(masullarsPage.data.map((item) => masulToApp(item, organizations)));
    }
  }, [masullarsPage, organizations]);

  useEffect(() => {
    if (youthPage) {
      const mappedYouth = youthPage.data.map((item) =>
        youthToApp(item, masullar, organizations)
      );
      setYouth(mappedYouth);
      setRemovedYouth(
        mappedYouth.filter((item) => item.status === "removed" || item.status === "graduated")
      );
    }
  }, [youthPage, masullar, organizations]);

  useEffect(() => {
    if (plansPage) {
      setPlans(plansPage.data.map((item) => planToApp(item, youth, masullar)));
    }
  }, [plansPage, youth, masullar]);

  useEffect(() => {
    if (meetingsPage) {
      setMeetings(meetingsPage.data.map((item) => meetingToApp(item, youth, masullar)));
    }
  }, [meetingsPage, youth, masullar]);

  const hasLoadedAnyData = queryResults.some((query) => query.data);
  const isLoading = !hasLoadedAnyData && queryResults.some((query) => query.isPending);
  const hasError = queryResults.some((query) => query.isError);
  const pagination = useMemo(
    () => ({
      organizations: pageToPagination(organizationsPage),
      masullar: pageToPagination(masullarsPage),
      youth: pageToPagination(youthPage),
      plans: pageToPagination(plansPage),
      meetings: pageToPagination(meetingsPage),
    }),
    [meetingsPage, masullarsPage, organizationsPage, plansPage, youthPage]
  );

  const value = useMemo(
    () => ({
      resources,
      isLoading,
      pagination,
      setResourceParams,
      setResourcePage,
      organizations,
      setOrganizations,
      masullar,
      setMasullar,
      youth,
      setYouth,
      removedYouth,
      setRemovedYouth,
      plans,
      setPlans,
      meetings,
      setMeetings,
    }),
    [
      isLoading,
      meetings,
      masullar,
      organizations,
      pagination,
      plans,
      removedYouth,
      resources,
      setResourcePage,
      setResourceParams,
      youth,
    ]
  );

  return (
    <PageDataContext.Provider value={value}>
      {isLoading ? (
        <PageLoader />
      ) : (
        <>
          {hasError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Backend javob bermadi</AlertTitle>
              <AlertDescription>
                Sahifa ochildi, lekin ma'lumotlarni yuklashda xatolik bo'ldi.
              </AlertDescription>
            </Alert>
          )}
          {children}
        </>
      )}
    </PageDataContext.Provider>
  );
}
