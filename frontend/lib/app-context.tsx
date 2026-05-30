"use client";

import React from "react";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  User,
  UserRole,
  Organization,
  Youth,
  Masul,
  IndividualPlan,
  Meeting,
  CompletedWork,
  ToshkentDistrict,
  DistrictStats,
} from "./types";
import { TOSHKENT_VILOYATI_DISTRICTS } from "./types";
import {
  mockUsers,
  mockOrganizations,
  mockYouth,
  mockMasullar,
  mockPlans,
  mockMeetings,
  mockCompletedWorks,
} from "./mock-data";

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: "success" | "error" | "warning" | "info";
}

export type YouthCategoryType = "jinoyatchilik" | "boshqa" | null;

interface AppContextType {
  // Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  switchRole: (role: UserRole) => void;

  // Youth Category Selection (Pre-Login)
  selectedYouthCategory: YouthCategoryType;
  setSelectedYouthCategory: (category: YouthCategoryType) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  selectedDistrict: ToshkentDistrict | "all";
  setSelectedDistrict: (district: ToshkentDistrict | "all") => void;

  // Data State
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  organizations: Organization[];
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
  youth: Youth[];
  setYouth: React.Dispatch<React.SetStateAction<Youth[]>>;
  masullar: Masul[];
  setMasullar: React.Dispatch<React.SetStateAction<Masul[]>>;
  plans: IndividualPlan[];
  setPlans: React.Dispatch<React.SetStateAction<IndividualPlan[]>>;
  meetings: Meeting[];
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  completedWorks: CompletedWork[];
  setCompletedWorks: React.Dispatch<React.SetStateAction<CompletedWork[]>>;
  removedYouth: Youth[];
  setRemovedYouth: React.Dispatch<React.SetStateAction<Youth[]>>;

  // CRUD Operations
  addOrganization: (
    org: Omit<Organization, "id" | "createdAt">
  ) => Organization;
  updateOrganization: (id: string, data: Partial<Organization>) => void;
  deleteOrganization: (id: string) => void;

  addYouth: (youth: Omit<Youth, "id" | "createdAt">) => Youth;
  updateYouth: (id: string, data: Partial<Youth>) => void;
  assignYouthToMasul: (youthId: string, masulId: string) => boolean;
  removeYouth: (youthId: string, reason: string) => void;

  addMasul: (masul: Omit<Masul, "id" | "createdAt">) => Masul;
  updateMasul: (id: string, data: Partial<Masul>) => void;
  deleteMasul: (id: string) => void;

  addPlan: (plan: Omit<IndividualPlan, "id" | "createdAt">) => IndividualPlan;
  updatePlan: (id: string, data: Partial<IndividualPlan>) => void;
  deletePlan: (id: string) => void;

  addMeeting: (meeting: Omit<Meeting, "id" | "createdAt">) => Meeting;
  updateMeeting: (id: string, data: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;

  addCompletedWork: (
    work: Omit<CompletedWork, "id" | "createdAt">
  ) => CompletedWork;

  addUser: (user: Omit<User, "id" | "createdAt">) => User;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // Role-based data filters
  getVisibleYouth: () => Youth[];
  getVisibleOrganizations: () => Organization[];
  getVisibleMasullar: () => Masul[];
  getVisiblePlans: () => IndividualPlan[];
  getVisibleMeetings: () => Meeting[];

  // District-based functions
  getAvailableDistricts: () => ToshkentDistrict[];
  canViewAllDistricts: () => boolean;
  getUserDistrict: () => ToshkentDistrict | null;
  getDistrictStats: (districtId?: ToshkentDistrict | "all") => DistrictStats[];
  getMasullarsForDistrict: (districtId: ToshkentDistrict) => Masul[];
  validateDistrictAssignment: (
    youthDistrictId: ToshkentDistrict,
    masulId: string
  ) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Youth Category Selection (Pre-Login)
  const [selectedYouthCategory, setSelectedYouthCategory] = useState<YouthCategoryType>(null);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedDistrict, setSelectedDistrict] = useState<
    ToshkentDistrict | "all"
  >("all");

  // Data State
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [organizations, setOrganizations] =
    useState<Organization[]>(mockOrganizations);
  const [youth, setYouth] = useState<Youth[]>(mockYouth);
  const [masullar, setMasullar] = useState<Masul[]>(mockMasullar);
  const [plans, setPlans] = useState<IndividualPlan[]>(mockPlans);
  const [meetings, setMeetings] = useState<Meeting[]>(mockMeetings);
  const [completedWorks, setCompletedWorks] =
    useState<CompletedWork[]>(mockCompletedWorks);
  const [removedYouth, setRemovedYouth] = useState<Youth[]>([]);

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Auth Functions
  const login = useCallback(
    (email: string, _password: string) => {
      const user = users.find((u) => u.email === email);
      if (user) {
        setCurrentUser(user);
        // Reset district filter based on role
        if (user.role === "tashkilot_direktori" && user.districtId) {
          setSelectedDistrict(user.districtId);
        } else if (
          user.role === "admin" ||
          user.role === "direktor" ||
          user.role === "moderator"
        ) {
          setSelectedDistrict("all");
        }
        return true;
      }
      return false;
    },
    [users]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setCurrentPage("dashboard");
    setSelectedDistrict("all");
    setSelectedYouthCategory(null);
  }, []);

  const switchRole = useCallback(
    (role: UserRole) => {
      const user = users.find((u) => u.role === role);
      if (user) {
        setCurrentUser(user);
        if (role === "tashkilot_direktori" && user.districtId) {
          setSelectedDistrict(user.districtId);
        } else {
          setSelectedDistrict("all");
        }
      }
    },
    [users]
  );

  // Toast Functions
  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Generate ID
  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const today = () => new Date().toISOString().split("T")[0];

  // District-based functions
  const canViewAllDistricts = useCallback(() => {
    if (!currentUser) return false;
    return ["admin", "direktor", "moderator"].includes(currentUser.role);
  }, [currentUser]);

  const getUserDistrict = useCallback((): ToshkentDistrict | null => {
    if (!currentUser) return null;
    if (currentUser.role === "tashkilot_direktori" && currentUser.districtId) {
      return currentUser.districtId;
    }
    if (currentUser.role === "masul_hodim" && currentUser.districtId) {
      return currentUser.districtId;
    }
    return null;
  }, [currentUser]);

  const getAvailableDistricts = useCallback((): ToshkentDistrict[] => {
    if (!currentUser) return [];
    if (canViewAllDistricts()) {
      return [...TOSHKENT_VILOYATI_DISTRICTS];
    }
    const userDistrict = getUserDistrict();
    if (userDistrict) {
      return [userDistrict];
    }
    return [];
  }, [currentUser, canViewAllDistricts, getUserDistrict]);

  const getMasullarsForDistrict = useCallback(
    (districtId: ToshkentDistrict): Masul[] => {
      return masullar.filter((m) => m.districtId === districtId);
    },
    [masullar]
  );

  const validateDistrictAssignment = useCallback(
    (youthDistrictId: ToshkentDistrict, masulId: string): boolean => {
      const masul = masullar.find((m) => m.id === masulId);
      if (!masul) return false;
      // Youth can only be assigned to mas'ul from the same district
      return masul.districtId === youthDistrictId;
    },
    [masullar]
  );

  const getDistrictStats = useCallback(
    (districtFilter?: ToshkentDistrict | "all"): DistrictStats[] => {
      const districts =
        districtFilter && districtFilter !== "all"
          ? [districtFilter]
          : [...TOSHKENT_VILOYATI_DISTRICTS];

      return districts.map((districtId) => {
        const districtYouth = youth.filter((y) => y.districtId === districtId);
        const districtOrgs = organizations.filter(
          (o) => o.districtId === districtId
        );
        const districtMasullar = masullar.filter(
          (m) => m.districtId === districtId
        );

        // Get plans and meetings for this district's youth
        const districtYouthIds = districtYouth.map((y) => y.id);
        const districtPlans = plans.filter((p) =>
          districtYouthIds.includes(p.youthId)
        );
        const districtMeetings = meetings.filter((m) =>
          districtYouthIds.includes(m.youthId)
        );

        const completedPlans = districtPlans.filter(
          (p) => p.status === "completed"
        ).length;
        const totalPlans = districtPlans.length;

        return {
          districtId,
          totalYouth: districtYouth.length,
          activeYouth: districtYouth.filter((y) => y.status === "active")
            .length,
          graduatedYouth: districtYouth.filter((y) => y.status === "graduated")
            .length,
          totalOrganizations: districtOrgs.length,
          totalMasullar: districtMasullar.length,
          totalPlans,
          completedPlans,
          totalMeetings: districtMeetings.length,
          completionRate: totalPlans > 0 ? (completedPlans / totalPlans) * 100 : 0,
          averageAiScore:
            districtYouth.length > 0
              ? districtYouth.reduce((sum, y) => sum + y.aiScore, 0) /
                districtYouth.length
              : 0,
        };
      });
    },
    [youth, organizations, masullar, plans, meetings]
  );

  // Organization CRUD
  const addOrganization = useCallback(
    (org: Omit<Organization, "id" | "createdAt">) => {
      const newOrg: Organization = {
        ...org,
        id: generateId(),
        createdAt: today(),
      };
      setOrganizations((prev) => [...prev, newOrg]);

      // Auto-create director user with district
      const directorUser: User = {
        id: generateId(),
        fullName: org.directorName,
        email: `${org.name.toLowerCase().replace(/\s+/g, "").slice(0, 10)}@yoshlar.uz`,
        role: "tashkilot_direktori",
        organizationId: newOrg.id,
        organizationName: newOrg.name,
        districtId: org.districtId,
        createdAt: today(),
      };
      setUsers((prev) => [...prev, directorUser]);

      addToast({
        title: "Tashkilot qo'shildi",
        description: `${newOrg.name} muvaffaqiyatli qo'shildi`,
        type: "success",
      });

      return newOrg;
    },
    [addToast]
  );

  const updateOrganization = useCallback(
    (id: string, data: Partial<Organization>) => {
      setOrganizations((prev) =>
        prev.map((org) => (org.id === id ? { ...org, ...data } : org))
      );
      addToast({
        title: "Tashkilot yangilandi",
        description: "O'zgarishlar saqlandi",
        type: "success",
      });
    },
    [addToast]
  );

  const deleteOrganization = useCallback(
    (id: string) => {
      setOrganizations((prev) => prev.filter((org) => org.id !== id));
      addToast({
        title: "Tashkilot o'chirildi",
        type: "info",
      });
    },
    [addToast]
  );

  // Youth CRUD
  const addYouth = useCallback(
    (youthData: Omit<Youth, "id" | "createdAt">) => {
      // Validate district is provided
      if (!youthData.districtId) {
        addToast({
          title: "Xatolik",
          description: "Tuman ko'rsatilishi shart",
          type: "error",
        });
        throw new Error("District is required for youth");
      }

      const newYouth: Youth = {
        ...youthData,
        id: generateId(),
        createdAt: today(),
      };
      setYouth((prev) => [...prev, newYouth]);

      // Update organization youth count
      if (newYouth.organizationId) {
        setOrganizations((prev) =>
          prev.map((org) =>
            org.id === newYouth.organizationId
              ? { ...org, yoshlarCount: org.yoshlarCount + 1 }
              : org
          )
        );
      }

      addToast({
        title: "Yosh qo'shildi",
        description: `${newYouth.fullName} muvaffaqiyatli qo'shildi`,
        type: "success",
      });
      return newYouth;
    },
    [addToast]
  );

  const updateYouth = useCallback(
    (id: string, data: Partial<Youth>) => {
      setYouth((prev) => prev.map((y) => (y.id === id ? { ...y, ...data } : y)));
      addToast({
        title: "Ma'lumotlar yangilandi",
        type: "success",
      });
    },
    [addToast]
  );

  const assignYouthToMasul = useCallback(
    (youthId: string, masulId: string): boolean => {
      const youthToAssign = youth.find((y) => y.id === youthId);
      const masul = masullar.find((m) => m.id === masulId);

      if (!youthToAssign || !masul) {
        addToast({
          title: "Xatolik",
          description: "Yosh yoki mas'ul topilmadi",
          type: "error",
        });
        return false;
      }

      // Validate same district
      if (youthToAssign.districtId !== masul.districtId) {
        addToast({
          title: "Xatolik",
          description: `Yoshni faqat o'z tumanidagi mas'ulga biriktirish mumkin. Yosh: ${youthToAssign.districtId}, Mas'ul: ${masul.districtId}`,
          type: "error",
        });
        return false;
      }

      setYouth((prev) =>
        prev.map((y) =>
          y.id === youthId
            ? {
                ...y,
                assignedMasulId: masulId,
                assignedMasulName: masul.fullName,
                organizationId: masul.organizationId,
                organizationName: masul.organizationName,
              }
            : y
        )
      );

      setMasullar((prev) =>
        prev.map((m) =>
          m.id === masulId
            ? { ...m, assignedYouthCount: m.assignedYouthCount + 1 }
            : m
        )
      );

      addToast({
        title: "Yosh biriktirildi",
        description: `${youthToAssign.fullName} - ${masul.fullName}ga biriktirildi`,
        type: "success",
      });

      return true;
    },
    [youth, masullar, addToast]
  );

  const removeYouth = useCallback(
    (youthId: string, reason: string) => {
      const youthToRemove = youth.find((y) => y.id === youthId);
      if (youthToRemove) {
        setYouth((prev) => prev.filter((y) => y.id !== youthId));
        setRemovedYouth((prev) => [
          ...prev,
          {
            ...youthToRemove,
            status: "graduated" as const,
            removalReason: reason,
            removalDate: today(),
          },
        ]);

        // Update organization count
        if (youthToRemove.organizationId) {
          setOrganizations((prev) =>
            prev.map((org) =>
              org.id === youthToRemove.organizationId
                ? { ...org, yoshlarCount: Math.max(0, org.yoshlarCount - 1) }
                : org
            )
          );
        }

        addToast({
          title: "Yosh ro'yxatdan chiqarildi",
          description: `${youthToRemove.fullName} chiqarilgan yoshlar ro'yxatiga o'tkazildi`,
          type: "info",
        });
      }
    },
    [youth, addToast]
  );

  // Masul CRUD
  const addMasul = useCallback(
    (masulData: Omit<Masul, "id" | "createdAt">) => {
      // Validate district
      if (!masulData.districtId) {
        addToast({
          title: "Xatolik",
          description: "Tuman ko'rsatilishi shart",
          type: "error",
        });
        throw new Error("District is required for masul");
      }

      const newMasul: Masul = {
        ...masulData,
        id: generateId(),
        createdAt: today(),
      };
      setMasullar((prev) => [...prev, newMasul]);

      // Also create user for masul with district
      const masulUser: User = {
        id: generateId(),
        fullName: masulData.fullName,
        email: masulData.email,
        role: "masul_hodim",
        organizationId: masulData.organizationId,
        organizationName: masulData.organizationName,
        districtId: masulData.districtId,
        createdAt: today(),
      };
      setUsers((prev) => [...prev, masulUser]);

      // Update organization masullar count
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === masulData.organizationId
            ? { ...org, masullarCount: org.masullarCount + 1 }
            : org
        )
      );

      addToast({
        title: "Mas'ul qo'shildi",
        description: `${newMasul.fullName} muvaffaqiyatli qo'shildi`,
        type: "success",
      });
      return newMasul;
    },
    [addToast]
  );

  const updateMasul = useCallback(
    (id: string, data: Partial<Masul>) => {
      setMasullar((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...data } : m))
      );
      addToast({
        title: "Mas'ul yangilandi",
        type: "success",
      });
    },
    [addToast]
  );

  const deleteMasul = useCallback(
    (id: string) => {
      const masul = masullar.find((m) => m.id === id);
      if (masul) {
        setMasullar((prev) => prev.filter((m) => m.id !== id));
        setOrganizations((prev) =>
          prev.map((org) =>
            org.id === masul.organizationId
              ? { ...org, masullarCount: Math.max(0, org.masullarCount - 1) }
              : org
          )
        );
        addToast({
          title: "Mas'ul o'chirildi",
          type: "info",
        });
      }
    },
    [masullar, addToast]
  );

  // Plan CRUD
  const addPlan = useCallback(
    (planData: Omit<IndividualPlan, "id" | "createdAt">) => {
      const newPlan: IndividualPlan = {
        ...planData,
        id: generateId(),
        createdAt: today(),
      };
      setPlans((prev) => [...prev, newPlan]);
      addToast({
        title: "Reja qo'shildi",
        description: `"${newPlan.title}" muvaffaqiyatli yaratildi`,
        type: "success",
      });
      return newPlan;
    },
    [addToast]
  );

  const updatePlan = useCallback(
    (id: string, data: Partial<IndividualPlan>) => {
      setPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...data } : p))
      );
      addToast({
        title: "Reja yangilandi",
        type: "success",
      });
    },
    [addToast]
  );

  const deletePlan = useCallback(
    (id: string) => {
      setPlans((prev) => prev.filter((p) => p.id !== id));
      addToast({
        title: "Reja o'chirildi",
        type: "info",
      });
    },
    [addToast]
  );

  // Meeting CRUD
  const addMeeting = useCallback(
    (meetingData: Omit<Meeting, "id" | "createdAt">) => {
      const newMeeting: Meeting = {
        ...meetingData,
        id: generateId(),
        createdAt: today(),
      };
      setMeetings((prev) => [...prev, newMeeting]);
      addToast({
        title: "Uchrashuv qo'shildi",
        description: `"${newMeeting.title}" rejalashtirildi`,
        type: "success",
      });
      return newMeeting;
    },
    [addToast]
  );

  const updateMeeting = useCallback(
    (id: string, data: Partial<Meeting>) => {
      setMeetings((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...data } : m))
      );
      addToast({
        title: "Uchrashuv yangilandi",
        type: "success",
      });
    },
    [addToast]
  );

  const deleteMeeting = useCallback(
    (id: string) => {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      addToast({
        title: "Uchrashuv o'chirildi",
        type: "info",
      });
    },
    [addToast]
  );

  // Completed Work
  const addCompletedWork = useCallback(
    (workData: Omit<CompletedWork, "id" | "createdAt">) => {
      const newWork: CompletedWork = {
        ...workData,
        id: generateId(),
        createdAt: today(),
      };
      setCompletedWorks((prev) => [...prev, newWork]);
      addToast({
        title: "Ish saqlandi",
        description: `"${newWork.title}" muvaffaqiyatli saqlandi`,
        type: "success",
      });
      return newWork;
    },
    [addToast]
  );

  // User CRUD
  const addUser = useCallback(
    (userData: Omit<User, "id" | "createdAt">) => {
      const newUser: User = {
        ...userData,
        id: generateId(),
        createdAt: today(),
      };
      setUsers((prev) => [...prev, newUser]);
      addToast({
        title: "Foydalanuvchi qo'shildi",
        description: `${newUser.fullName} muvaffaqiyatli qo'shildi`,
        type: "success",
      });
      return newUser;
    },
    [addToast]
  );

  const updateUser = useCallback(
    (id: string, data: Partial<User>) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...data } : u))
      );
      addToast({
        title: "Foydalanuvchi yangilandi",
        type: "success",
      });
    },
    [addToast]
  );

  const deleteUser = useCallback(
    (id: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      addToast({
        title: "Foydalanuvchi o'chirildi",
        type: "info",
      });
    },
    [addToast]
  );

  // Role-based data filters with district support
  const getVisibleYouth = useCallback(() => {
    if (!currentUser) return [];

    let filteredYouth = youth;

    switch (currentUser.role) {
      case "admin":
      case "direktor":
        // Can see all, but respect selected district filter
        if (selectedDistrict !== "all") {
          filteredYouth = youth.filter(
            (y) => y.districtId === selectedDistrict
          );
        }
        break;
      case "moderator":
        // Can see aggregated data across all districts
        if (selectedDistrict !== "all") {
          filteredYouth = youth.filter(
            (y) => y.districtId === selectedDistrict
          );
        }
        break;
      case "tashkilot_direktori":
        // Can only see own district
        filteredYouth = youth.filter(
          (y) => y.districtId === currentUser.districtId
        );
        break;
      case "masul_hodim":
        // Can only see assigned youth
        filteredYouth = youth.filter(
          (y) => y.assignedMasulId === currentUser.id
        );
        break;
      default:
        return [];
    }

    return filteredYouth;
  }, [currentUser, youth, selectedDistrict]);

  const getVisibleOrganizations = useCallback(() => {
    if (!currentUser) return [];

    switch (currentUser.role) {
      case "admin":
      case "direktor":
      case "moderator":
        if (selectedDistrict !== "all") {
          return organizations.filter(
            (o) => o.districtId === selectedDistrict
          );
        }
        return organizations;
      case "tashkilot_direktori":
        return organizations.filter(
          (o) => o.districtId === currentUser.districtId
        );
      default:
        return [];
    }
  }, [currentUser, organizations, selectedDistrict]);

  const getVisibleMasullar = useCallback(() => {
    if (!currentUser) return [];

    switch (currentUser.role) {
      case "admin":
      case "direktor":
        if (selectedDistrict !== "all") {
          return masullar.filter((m) => m.districtId === selectedDistrict);
        }
        return masullar;
      case "tashkilot_direktori":
        return masullar.filter(
          (m) => m.districtId === currentUser.districtId
        );
      default:
        return [];
    }
  }, [currentUser, masullar, selectedDistrict]);

  const getVisiblePlans = useCallback(() => {
    if (!currentUser) return [];

    switch (currentUser.role) {
      case "admin":
      case "direktor":
        if (selectedDistrict !== "all") {
          const districtMasulIds = masullar
            .filter((m) => m.districtId === selectedDistrict)
            .map((m) => m.id);
          return plans.filter((p) => districtMasulIds.includes(p.masulId));
        }
        return plans;
      case "tashkilot_direktori":
        return plans.filter((p) => {
          const masul = masullar.find((m) => m.id === p.masulId);
          return masul?.districtId === currentUser.districtId;
        });
      case "masul_hodim":
        return plans.filter((p) => p.masulId === currentUser.id);
      default:
        return [];
    }
  }, [currentUser, plans, masullar, selectedDistrict]);

  const getVisibleMeetings = useCallback(() => {
    if (!currentUser) return [];

    switch (currentUser.role) {
      case "admin":
      case "direktor":
        if (selectedDistrict !== "all") {
          const districtMasulIds = masullar
            .filter((m) => m.districtId === selectedDistrict)
            .map((m) => m.id);
          return meetings.filter((m) => districtMasulIds.includes(m.masulId));
        }
        return meetings;
      case "tashkilot_direktori":
        return meetings.filter((m) => {
          const masul = masullar.find((mas) => mas.id === m.masulId);
          return masul?.districtId === currentUser.districtId;
        });
      case "masul_hodim":
        return meetings.filter((m) => m.masulId === currentUser.id);
      default:
        return [];
    }
  }, [currentUser, meetings, masullar, selectedDistrict]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        login,
        logout,
        switchRole,
        selectedYouthCategory,
        setSelectedYouthCategory,
        sidebarOpen,
        setSidebarOpen,
        currentPage,
        setCurrentPage,
        selectedDistrict,
        setSelectedDistrict,
        users,
        setUsers,
        organizations,
        setOrganizations,
        youth,
        setYouth,
        masullar,
        setMasullar,
        plans,
        setPlans,
        meetings,
        setMeetings,
        completedWorks,
        setCompletedWorks,
        removedYouth,
        setRemovedYouth,
        addOrganization,
        updateOrganization,
        deleteOrganization,
        addYouth,
        updateYouth,
        assignYouthToMasul,
        removeYouth,
        addMasul,
        updateMasul,
        deleteMasul,
        addPlan,
        updatePlan,
        deletePlan,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        addCompletedWork,
        addUser,
        updateUser,
        deleteUser,
        toasts,
        addToast,
        removeToast,
        getVisibleYouth,
        getVisibleOrganizations,
        getVisibleMasullar,
        getVisiblePlans,
        getVisibleMeetings,
        getAvailableDistricts,
        canViewAllDistricts,
        getUserDistrict,
        getDistrictStats,
        getMasullarsForDistrict,
        validateDistrictAssignment,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
