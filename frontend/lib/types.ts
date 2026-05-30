// Toshkent viloyati tumanlari (14 districts)
export const TOSHKENT_VILOYATI_DISTRICTS = [
  "Bekobod tumani",
  "Bo'ka tumani",
  "Bo'stonliq tumani",
  "Chinoz tumani",
  "Qibray tumani",
  "Ohangaron tumani",
  "Oqqo'rg'on tumani",
  "Parkent tumani",
  "Piskent tumani",
  "Quyi Chirchiq tumani",
  "Yangiyo'l tumani",
  "Yuqori Chirchiq tumani",
  "Zangiota tumani",
  "Toshkent tumani",
] as const;

export type ToshkentDistrict = (typeof TOSHKENT_VILOYATI_DISTRICTS)[number];

// User Roles
export type UserRole =
  | "admin"
  | "direktor"
  | "tashkilot_direktori"
  | "masul_hodim"
  | "moderator";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
  districtId?: ToshkentDistrict; // District assignment for tashkilot_direktori
  avatar?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  districtId: ToshkentDistrict; // Required district
  address: string;
  directorId: string;
  directorName: string;
  masullarCount: number;
  yoshlarCount: number;
  createdAt: string;
}

export interface Youth {
  id: string;
  fullName: string;
  birthDate: string;
  address: string;
  districtId: ToshkentDistrict; // Required district
  phone: string;
  category: string;
  status: "active" | "inactive" | "graduated";
  assignedMasulId?: string;
  assignedMasulName?: string;
  organizationId?: string;
  organizationName?: string;
  aiScore: number;
  plansCount: number;
  meetingsCount: number;
  createdAt: string;
  removalReason?: string;
  removalDate?: string;
}

export interface Masul {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  districtId: ToshkentDistrict; // Required district
  organizationId: string;
  organizationName: string;
  assignedYouthCount: number;
  completedPlansCount: number;
  meetingsCount: number;
  aiScore: number;
  createdAt: string;
}

export interface IndividualPlan {
  id: string;
  youthId: string;
  youthName: string;
  masulId: string;
  masulName: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  progress: number;
  createdAt: string;
}

export interface Meeting {
  id: string;
  youthId: string;
  youthName: string;
  masulId: string;
  masulName: string;
  title: string;
  description: string;
  date: string;
  location: string;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
  photos?: string[];
  createdAt: string;
}

export interface CompletedWork {
  id: string;
  youthId: string;
  youthName: string;
  masulId: string;
  masulName: string;
  planId?: string;
  title: string;
  description: string;
  date: string;
  result: string;
  photos?: string[];
  createdAt: string;
}

export interface RatingData {
  id: string;
  name: string;
  type: "tuman" | "tashkilot" | "masul";
  score: number;
  completionRate: number;
  meetingsCount: number;
  plansCount: number;
  yoshlarCount: number;
}

export interface DashboardStats {
  totalYouth: number;
  activeYouth: number;
  graduatedYouth: number;
  totalOrganizations: number;
  totalMasullar: number;
  totalPlans: number;
  completedPlans: number;
  totalMeetings: number;
  averageAiScore: number;
}

// Navigation items
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
  badge?: number;
}

// Filter options
export interface FilterOption {
  value: string;
  label: string;
}

// District Statistics
export interface DistrictStats {
  districtId: ToshkentDistrict;
  totalYouth: number;
  activeYouth: number;
  graduatedYouth: number;
  totalOrganizations: number;
  totalMasullar: number;
  totalPlans: number;
  completedPlans: number;
  totalMeetings: number;
  completionRate: number;
  averageAiScore: number;
}
