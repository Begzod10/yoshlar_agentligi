export const APP_PAGE_IDS = [
  "dashboard",
  "yoshlar",
  "tashkilotlar",
  "masullar",
  "rejalar",
  "uchrashuvlar",
  "monitoring",
  "chiqarilgan",
  "foydalanuvchilar",
  "sozlamalar",
] as const;

export type AppPageId = (typeof APP_PAGE_IDS)[number];

export const APP_PAGE_HREFS: Record<AppPageId, string> = {
  dashboard: "/dashboard",
  yoshlar: "/yoshlar",
  tashkilotlar: "/tashkilotlar",
  masullar: "/masullar",
  rejalar: "/rejalar",
  uchrashuvlar: "/uchrashuvlar",
  monitoring: "/monitoring",
  chiqarilgan: "/chiqarilgan",
  foydalanuvchilar: "/foydalanuvchilar",
  sozlamalar: "/sozlamalar",
};

export function isAppPageId(page: string): page is AppPageId {
  return APP_PAGE_IDS.includes(page as AppPageId);
}

export function pageToHref(page: string): string {
  return isAppPageId(page) ? APP_PAGE_HREFS[page] : APP_PAGE_HREFS.dashboard;
}

export function pathnameToPage(pathname: string | null): AppPageId {
  const segment = pathname?.split("/").filter(Boolean)[0] ?? "dashboard";
  return isAppPageId(segment) ? segment : "dashboard";
}
