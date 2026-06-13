"use client";

import React, {createContext, type ReactNode, useCallback, useContext, useEffect, useState} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/api/client";
import {useCurrentUser} from "@/lib/auth/session";
import {useMasullar, useMeetings, useOrganizations, usePlans, useYouthList,} from "@/lib/api/hooks/use-core-api";
import type {MasulRead, MeetingRead, OrganizationRead, PlanRead, User as ApiUser, YouthRead,} from "@/lib/api/types";
import type {
  CompletedWork,
  DistrictStats,
  IndividualPlan,
  Masul,
  Meeting,
  Organization,
  ToshkentDistrict,
  User,
  UserRole,
  Youth,
} from "./types";
import {TOSHKENT_VILOYATI_DISTRICTS} from "./types";
import {
  mockCompletedWorks,
  mockMasullar,
  mockMeetings,
  mockOrganizations,
  mockPlans,
  mockUsers,
  mockYouth,
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
    showToast: (title: string, type?: Toast["type"], description?: string) => void;
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

function asDistrict(districtId?: string | null): ToshkentDistrict {
    return (districtId || TOSHKENT_VILOYATI_DISTRICTS[0]) as ToshkentDistrict;
}

function apiUserToAppUser(user: ApiUser): User {
    return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phone: user.phone ?? undefined,
        status: user.isActive ? "active" : "inactive",
        lastLogin: user.lastLoginAt ?? undefined,
        districtId: user.districtId ? asDistrict(user.districtId) : undefined,
        createdAt: user.createdAt,
    };
}

export function organizationToApp(org: OrganizationRead): Organization {
    return {
        id: org.id,
        name: org.name,
        districtId: asDistrict(org.districtId),
        address: org.address ?? "",
        directorId: "",
        directorName: org.directorName ?? "",
        masullarCount: 0,
        yoshlarCount: 0,
        createdAt: org.createdAt,
    };
}

export function masulToApp(masul: MasulRead, organizations: Organization[]): Masul {
    const organization = organizations.find((org) => org.id === masul.organizationId);
    return {
        id: masul.id,
        fullName: masul.fullName,
        email: masul.email || "",
        phone: masul.phone ?? "",
        districtId: asDistrict(masul.districtId),
        organizationId: masul.organizationId ?? "",
        organizationName: organization?.name ?? "",
        assignedYouthCount: 0,
        completedPlansCount: 0,
        meetingsCount: 0,
        aiScore: 0,
        createdAt: masul.createdAt,
    };
}

export function youthToApp(youth: YouthRead, masullar: Masul[], organizations: Organization[]): Youth {
    const masul = masullar.find((item) => item.id === youth.masulId);
    const organization = organizations.find((item) => item.id === youth.organizationId);
    return {
        id: youth.id,
        fullName: youth.fullName,
        birthDate: youth.dateOfBirth ?? "",
        address: youth.address ?? "",
        districtId: asDistrict(youth.districtId),
        phone: youth.contact ?? "",
        category: "boshqa",
        status: youth.status,
        assignedMasulId: youth.masulId ?? undefined,
        assignedMasulName: masul?.fullName,
        organizationId: youth.organizationId ?? undefined,
        organizationName: organization?.name,
        aiScore: 0,
        plansCount: 0,
        meetingsCount: 0,
        createdAt: youth.createdAt,
        removalReason:
            typeof youth.removalProposal?.reason === "string"
                ? youth.removalProposal.reason
                : undefined,
    };
}

export function planToApp(plan: PlanRead, youth: Youth[], masullar: Masul[]): IndividualPlan {
    const planYouth = youth.find((item) => item.id === plan.youthId);
    const masul = masullar.find((item) => item.id === plan.masulId);
    return {
        id: plan.id,
        youthId: plan.youthId,
        youthName: planYouth?.fullName ?? "",
        masulId: plan.masulId ?? "",
        masulName: masul?.fullName ?? "",
        title: plan.title,
        description: plan.goal ?? "",
        startDate: plan.startDate ?? "",
        endDate: plan.endDate ?? "",
        status: plan.status === "draft" ? "planned" : plan.status,
        progress: plan.progress,
        createdAt: plan.createdAt,
    };
}

export function meetingToApp(meeting: MeetingRead, youth: Youth[], masullar: Masul[]): Meeting {
    const meetingYouth = youth.find((item) => item.id === meeting.youthId);
    const masul = masullar.find((item) => item.id === meeting.masulId);
    return {
        id: meeting.id,
        youthId: meeting.youthId,
        youthName: meetingYouth?.fullName ?? "",
        masulId: meeting.masulId ?? "",
        masulName: masul?.fullName ?? "",
        title: meeting.type ?? "Uchrashuv",
        description: meeting.agenda ?? "",
        date: meeting.scheduledAt.slice(0, 10),
        time: meeting.scheduledAt.slice(11, 16),
        location: meeting.location ?? "",
        type: meeting.type ?? "",
        status: meeting.attendanceStatus === "attended" ? "completed" : meeting.attendanceStatus === "no_show" ? "cancelled" : "scheduled",
        notes: meeting.attendanceNotes ?? undefined,
        photos: [],
        createdAt: meeting.createdAt,
    };
}

const LS_KEYS = {
    user: "app_current_user",
    district: "app_selected_district",
    page: "app_current_page",
    youthCategory: "app_youth_category",
};


function loadLS<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function saveLS(key: string, value: any) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
    }
}

export function AppProvider({children}: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const sessionUser = useCurrentUser();
    const organizationsQuery = useOrganizations({limit: 100, enabled: Boolean(sessionUser)});
    const masullarQuery = useMasullar({limit: 100, enabled: Boolean(sessionUser)});
    const youthQuery = useYouthList({limit: 100, enabled: Boolean(sessionUser)});
    const plansQuery = usePlans({limit: 100, enabled: Boolean(sessionUser)});
    const meetingsQuery = useMeetings({limit: 100, enabled: Boolean(sessionUser)});

    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(
        loadLS(LS_KEYS.user, null)
    );
    console.log(currentUser, "currentUser")
    // Youth Category Selection (Pre-Login)
    const [selectedYouthCategory, setSelectedYouthCategory] =
        useState<YouthCategoryType>(loadLS(LS_KEYS.youthCategory, null));
    // UI State
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentPage, setCurrentPage] = useState(
        loadLS(LS_KEYS.page, "dashboard")
    );
    const [selectedDistrict, setSelectedDistrict] = useState<
        ToshkentDistrict | "all"
    >(loadLS(LS_KEYS.district, "all"));

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
    console.log(meetings , "mett")
    // Toast State
    const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    saveLS(LS_KEYS.user, currentUser);
  }, [currentUser]);
  useEffect(() => {
    saveLS(LS_KEYS.page, currentPage);
  }, [currentPage]);
  useEffect(() => {
    saveLS(LS_KEYS.district, selectedDistrict);
  }, [selectedDistrict]);
  useEffect(() => {
    saveLS(LS_KEYS.youthCategory, selectedYouthCategory);
  }, [selectedYouthCategory]);
    useEffect(() => {
        setCurrentUser(sessionUser ? apiUserToAppUser(sessionUser) : null);
    }, [sessionUser]);

    useEffect(() => {
        if (organizationsQuery.data) {
            setOrganizations(organizationsQuery.data.data.map(organizationToApp));
        }
    }, [organizationsQuery.data]);

    useEffect(() => {
        if (masullarQuery.data) {
            console.log(masullarQuery.data.data
            , "masss")
            setMasullar(masullarQuery.data.data.map((item) => masulToApp(item, organizations)));
        }
    }, [masullarQuery.data, organizations]);

    useEffect(() => {
        if (youthQuery.data) {
            setYouth(youthQuery.data.data.map((item) => youthToApp(item, masullar, organizations)));
            setRemovedYouth(
                youthQuery.data.data
                    .filter((item) => item.status === "removed" || item.status === "graduated")
                    .map((item) => youthToApp(item, masullar, organizations))
            );
        }
    }, [youthQuery.data, masullar, organizations]);

    useEffect(() => {
        if (plansQuery.data) {
            setPlans(plansQuery.data.data.map((item) => planToApp(item, youth, masullar)));
        }
    }, [plansQuery.data, youth, masullar]);

    useEffect(() => {
        if (meetingsQuery.data) {
            console.log(meetingsQuery.data.data , "dasd")
            setMeetings(meetingsQuery.data.data.map((item) => meetingToApp(item, youth, masullar)));
        }
    }, [meetingsQuery.data, youth, masullar]);

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
        setToasts((prev) => [...prev, {...toast, id}]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const showToast = useCallback(
        (title: string, type: Toast["type"] = "info", description?: string) => {
            addToast({title, description, type});
        },
        [addToast]
    );

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
            void api
                .post<OrganizationRead>("/api/organizations", {
                    name: org.name,
                    districtId: org.districtId,
                    address: org.address || null,
                    directorName: org.directorName || null,
                })
                .then(() => queryClient.invalidateQueries({queryKey: ["organizations"]}))
                .catch(() =>
                    addToast({
                        title: "Backendga saqlanmadi",
                        description: "Tashkilot lokal qo'shildi, lekin API xato qaytardi",
                        type: "warning",
                    })
                );

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
        [addToast, queryClient]
    );

    const updateOrganization = useCallback(
        (id: string, data: Partial<Organization>) => {
            setOrganizations((prev) =>
                prev.map((org) => (org.id === id ? {...org, ...data} : org))
            );
            void api
                .patch<OrganizationRead>(`/api/organizations/${id}`, {
                    name: data.name,
                    address: data.address,
                    directorName: data.directorName,
                })
                .then(() => queryClient.invalidateQueries({queryKey: ["organizations"]}))
                .catch(() =>
                    addToast({
                        title: "Backend yangilanmadi",
                        type: "warning",
                    })
                );
            addToast({
                title: "Tashkilot yangilandi",
                description: "O'zgarishlar saqlandi",
                type: "success",
            });
        },
        [addToast, queryClient]
    );

    const deleteOrganization = useCallback(
        (id: string) => {
            setOrganizations((prev) => prev.filter((org) => org.id !== id));
            void api
                .delete<void>(`/api/organizations/${id}`, {query: {confirm: true}})
                .then(() => queryClient.invalidateQueries({queryKey: ["organizations"]}))
                .catch(() =>
                    addToast({
                        title: "Backenddan o'chirilmadi",
                        type: "warning",
                    })
                );
            addToast({
                title: "Tashkilot o'chirildi",
                type: "info",
            });
        },
        [addToast, queryClient]
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
            void api
                .post<YouthRead>("/api/youth", {
                    fullName: youthData.fullName,
                    districtId: youthData.districtId,
                    masulId: youthData.assignedMasulId ?? null,
                    organizationId: youthData.organizationId ?? null,
                    contact: youthData.phone || null,
                    dateOfBirth: youthData.birthDate || null,
                    address: youthData.address || null,
                    notes: youthData.category || null

                })
                .then(() => queryClient.invalidateQueries({queryKey: ["youth"]}))
                .catch(() =>
                    addToast({
                        title: "Backendga saqlanmadi",
                        description: "Yosh lokal qo'shildi, lekin API xato qaytardi",
                        type: "warning",
                    })
                );

            // Update organization youth count
            if (newYouth.organizationId) {
                setOrganizations((prev) =>
                    prev.map((org) =>
                        org.id === newYouth.organizationId
                            ? {...org, yoshlarCount: org.yoshlarCount + 1}
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
        [addToast, queryClient]
    );

    const updateYouth = useCallback(
        (id: string, data: Partial<Youth>) => {
            setYouth((prev) => prev.map((y) => (y.id === id ? {...y, ...data} : y)));
            void api
                .patch<YouthRead>(`/api/youth/${id}`, {
                    fullName: data.fullName,
                    masulId: data.assignedMasulId,
                    organizationId: data.organizationId,
                    contact: data.phone,
                    dateOfBirth: data.birthDate,
                    address: data.address,
                    notes: data.category
                })
                .then(() => queryClient.invalidateQueries({queryKey: ["youth"]}))
                .catch(() =>
                    addToast({
                        title: "Backend yangilanmadi",
                        type: "warning",
                    })
                );
            addToast({
                title: "Ma'lumotlar yangilandi",
                type: "success",
            });
        },
        [addToast, queryClient]
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
                        ? {...m, assignedYouthCount: m.assignedYouthCount + 1}
                        : m
                )
            );
            void api
                .post<YouthRead>(`/api/youth/${youthId}/assign-masul`, {masulId})
                .then(() => queryClient.invalidateQueries({queryKey: ["youth"]}))
                .catch(() =>
                    addToast({
                        title: "Backendda biriktirilmadi",
                        type: "warning",
                    })
                );

            addToast({
                title: "Yosh biriktirildi",
                description: `${youthToAssign.fullName} - ${masul.fullName}ga biriktirildi`,
                type: "success",
            });

            return true;
        },
        [youth, masullar, addToast, queryClient]
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
                void api
                    .post<YouthRead>(`/api/youth/${youthId}/status`, {status: "removed"})
                    .then(() => queryClient.invalidateQueries({queryKey: ["youth"]}))
                    .catch(() =>
                        addToast({
                            title: "Backendda status yangilanmadi",
                            type: "warning",
                        })
                    );

                // Update organization count
                if (youthToRemove.organizationId) {
                    setOrganizations((prev) =>
                        prev.map((org) =>
                            org.id === youthToRemove.organizationId
                                ? {...org, yoshlarCount: Math.max(0, org.yoshlarCount - 1)}
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
        [youth, addToast, queryClient]
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
            void api
                .post<MasulRead>("/api/masullar", {
                    fullName: masulData.fullName,
                    districtId: masulData.districtId,
                    organizationId: masulData.organizationId || null,
                    phone: masulData.phone || null,
                    position: null,
                })
                .then(() => queryClient.invalidateQueries({queryKey: ["masullar"]}))
                .catch(() =>
                    addToast({
                        title: "Backendga saqlanmadi",
                        description: "Mas'ul lokal qo'shildi, lekin API xato qaytardi",
                        type: "warning",
                    })
                );

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
                        ? {...org, masullarCount: org.masullarCount + 1}
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
        [addToast, queryClient]
    );

    const updateMasul = useCallback(
        (id: string, data: Partial<Masul>) => {
            setMasullar((prev) =>
                prev.map((m) => (m.id === id ? {...m, ...data} : m))
            );
            void api
                .patch<MasulRead>(`/api/masullar/${id}`, {
                    fullName: data.fullName,
                    organizationId: data.organizationId,
                    email: data.email,
                    phone: data.phone,
                })
                .then(() => queryClient.invalidateQueries({queryKey: ["masullar"]}))
                .catch(() =>
                    addToast({
                        title: "Backend yangilanmadi",
                        type: "warning",
                    })
                );
            addToast({
                title: "Mas'ul yangilandi",
                type: "success",
            });
        },
        [addToast, queryClient]
    );

    const deleteMasul = useCallback(
        (id: string) => {
            const masul = masullar.find((m) => m.id === id);
            if (masul) {
                setMasullar((prev) => prev.filter((m) => m.id !== id));
                void api
                    .delete<void>(`/api/masullar/${id}`)
                    .then(() => queryClient.invalidateQueries({queryKey: ["masullar"]}))
                    .catch(() =>
                        addToast({
                            title: "Backenddan o'chirilmadi",
                            type: "warning",
                        })
                    );
                setOrganizations((prev) =>
                    prev.map((org) =>
                        org.id === masul.organizationId
                            ? {...org, masullarCount: Math.max(0, org.masullarCount - 1)}
                            : org
                    )
                );
                addToast({
                    title: "Mas'ul o'chirildi",
                    type: "info",
                });
            }
        },
        [masullar, addToast, queryClient]
    );

    // Plan CRUD
    const addPlan = useCallback(
        (planData: Omit<IndividualPlan, "id" | "createdAt">) => {
            const newPlan: IndividualPlan = {
                ...planData,
                id: generateId(),
                createdAt: today(),
            };

            // optimistic update
            setPlans((prev) => [...prev, newPlan]);

            const payload = {
                youth_id: planData.youthId,
                masul_id: planData.masulId, // 🔥 FIX HERE
                title: planData.title,
                goal: planData.description || null,
                milestones: [],
                start_date: planData.startDate || null,
                end_date: planData.endDate || null,
            };

            void api
                .post<PlanRead>("/api/plans", payload)
                .then(() => {
                    queryClient.invalidateQueries({queryKey: ["plans"]});

                    addToast({
                        title: "Reja qo'shildi",
                        description: `"${newPlan.title}" muvaffaqiyatli yaratildi`,
                        type: "success",
                    });
                })
                .catch(() => {
                    addToast({
                        title: "Backendga saqlanmadi",
                        description: "Reja lokal qo'shildi, lekin API xato qaytardi",
                        type: "warning",
                    });
                });

            return newPlan;
        },
        [addToast, queryClient]
    );

    const updatePlan = useCallback(
        (id: string, data: Partial<IndividualPlan>) => {
            setPlans((prev) =>
                prev.map((p) => (p.id === id ? {...p, ...data} : p))
            );
            void api
                .patch<PlanRead>(`/api/plans/${id}`, {
                    title: data.title,
                    goal: data.description,
                    status: data.status === "planned" ? "draft" : data.status,
                    progress: data.progress,
                    startDate: data.startDate,
                    endDate: data.endDate,
                })
                .then(() => queryClient.invalidateQueries({queryKey: ["plans"]}))
                .catch(() =>
                    addToast({
                        title: "Backend yangilanmadi",
                        type: "warning",
                    })
                );
            addToast({
                title: "Reja yangilandi",
                type: "success",
            });
        },
        [addToast, queryClient]
    );

    const deletePlan = useCallback(
        (id: string) => {
            setPlans((prev) => prev.filter((p) => p.id !== id));
            void api
                .delete<void>(`/api/plans/${id}`)
                .then(() => queryClient.invalidateQueries({queryKey: ["plans"]}))
                .catch(() =>
                    addToast({
                        title: "Backenddan o'chirilmadi",
                        type: "warning",
                    })
                );
            addToast({
                title: "Reja o'chirildi",
                type: "info",
            });
        },
        [addToast, queryClient]
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
            void api
                .post<MeetingRead>("/api/meetings", {
                    youth_id: meetingData.youthId,
                    masul_id: meetingData.masulId,
                    scheduled_at: meetingData.time
                        ? `${meetingData.date}T${meetingData.time}:00`
                        : meetingData.date,
                    type: meetingData.type,
                    location: meetingData.location,
                    agenda: meetingData.agenda || meetingData.description || null,
                })
                .then(() => queryClient.invalidateQueries({queryKey: ["meetings"]}))
                .catch(() =>
                    addToast({
                        title: "Backendga saqlanmadi",
                        description: "Uchrashuv lokal qo'shildi, lekin API xato qaytardi",
                        type: "warning",
                    })
                );
            addToast({
                title: "Uchrashuv qo'shildi",
                description: `"${newMeeting.title}" rejalashtirildi`,
                type: "success",
            });
            return newMeeting;
        },
        [addToast, queryClient]
    );

    const updateMeeting = useCallback(
        (id: string, data: Partial<Meeting>) => {
            setMeetings((prev) =>
                prev.map((m) => (m.id === id ? { ...m, ...data } : m))
            );

            const payload = {
                scheduledAt:
                    data.time && data.date
                        ? `${data.date}T${data.time}:00`
                        : data.date,
                type: data.type,
                location: data.location,
                agenda: data.description,
                status: data.status,
                attendanceStatus: data.attendanceStatus,
                notes: data.notes,
                attachments: data.attachments,
            };

            console.log("UPDATE DATA", data);
            console.log("API PAYLOAD", payload);

            void api
                .patch(`/api/meetings/${id}`, payload)
                .then(() =>
                    queryClient.invalidateQueries({ queryKey: ["meetings"] })
                )
                .catch((err) => {
                    console.error(err);
                    addToast({
                        title: "Backend yangilanmadi",
                        type: "warning",
                    });
                });

            addToast({
                title: "Uchrashuv yangilandi",
                type: "success",
            });
        },
        [addToast, queryClient]
    );

    const deleteMeeting = useCallback(
        (id: string) => {
            setMeetings((prev) => prev.filter((m) => m.id !== id));
            void api
                .delete<void>(`/api/meetings/${id}`)
                .then(() => queryClient.invalidateQueries({queryKey: ["meetings"]}))
                .catch(() =>
                    addToast({
                        title: "Backenddan o'chirilmadi",
                        type: "warning",
                    })
                );
            addToast({
                title: "Uchrashuv o'chirildi",
                type: "info",
            });
        },
        [addToast, queryClient]
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
                prev.map((u) => (u.id === id ? {...u, ...data} : u))
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
                    (y) => y.masulId === currentUser.masulId
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
                showToast,
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
