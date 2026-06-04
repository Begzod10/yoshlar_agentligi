"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePageDataContext, type PageResource } from "@/lib/page-data-context";

interface ResourcePaginationProps {
  resource: PageResource;
}

export function ResourcePagination({ resource }: ResourcePaginationProps) {
  const pageData = usePageDataContext();
  const pagination = pageData?.pagination[resource];

  if (!pageData || !pagination || pagination.total <= pagination.limit) {
    return null;
  }

  const firstItem = (pagination.page - 1) * pagination.limit + 1;
  const lastItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {firstItem}-{lastItem} / {pagination.total} ta
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 bg-transparent"
          disabled={pagination.page <= 1}
          onClick={() => pageData.setResourcePage(resource, pagination.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Oldingi
        </Button>
        <span className="min-w-16 text-center">
          {pagination.page}/{pagination.totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 bg-transparent"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => pageData.setResourcePage(resource, pagination.page + 1)}
        >
          Keyingi
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
