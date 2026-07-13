import axios, { AxiosHeaders } from "axios";
import { useAuthStore } from "@/stores/auth";
import type {
  WorkloadDashboard,
  TeamWorkloadResponse,
  LeadPublic,
  LeadUpdate,
  ActivityPublic,
  ActivityCreate,
  SalesDashboardOverview,
  AnalyticsOverview,
  LeadStatusUpdate,
  LeadStatus,
  SearchResults,
} from "./types";

const isProd = Boolean((import.meta as any).env?.PROD);
const envBase = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)?.trim();
const inferredBase =
  typeof window !== "undefined" ? `${window.location.origin}/api/v1` : undefined;

export const API_BASE_URL =
  envBase ??
  (!isProd ? inferredBase : undefined) ??
  inferredBase ??
  "http://127.0.0.1:8010/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = AxiosHeaders.from(config.headers ?? {});
    (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      const { token, clear } = useAuthStore.getState();
      if (token) clear();
    }
    return Promise.reject(error);
  },
);

// New API functions
export const getMyWorkload = async (): Promise<WorkloadDashboard> => {
  const res = await api.get("/workload/my-dashboard");
  return res.data;
};

export const getTeamWorkload = async (): Promise<TeamWorkloadResponse> => {
  const res = await api.get("/workload/team");
  return res.data;
};

export const updateLead = async (
  leadId: string,
  data: LeadUpdate,
): Promise<LeadPublic> => {
  const res = await api.patch(`/leads/${leadId}`, data);
  return res.data;
};

export const getLeadActivities = async (
  leadId: string,
): Promise<ActivityPublic[]> => {
  const res = await api.get(`/activities/leads/${leadId}`);
  return res.data;
};

export const createActivity = async (
  leadId: string,
  data: ActivityCreate,
): Promise<ActivityPublic> => {
  const res = await api.post(`/activities/leads/${leadId}`, data);
  return res.data;
};

export const getSalesOverview = async (): Promise<SalesDashboardOverview> => {
  const res = await api.get("/dashboard/sales-overview");
  return res.data;
};

export const getAnalyticsOverview = async (): Promise<AnalyticsOverview> => {
  const res = await api.get("/analytics/overview");
  return res.data;
};

export const updateLeadStatus = async (leadId: string, leadStatus: LeadStatus): Promise<LeadPublic> => {
  const res = await api.patch(`/leads/${encodeURIComponent(leadId)}/status`, { lead_status: leadStatus });
  return res.data;
};

export const getSearchResults = async (query: string): Promise<SearchResults> => {
  const res = await api.get("/search", { params: { q: query } });
  return res.data;
};

export const getPinnedLeads = async (): Promise<LeadPublic[]> => {
  const res = await api.get("/leads/pinned");
  return res.data;
};

export const pinLead = async (leadId: string): Promise<void> => {
  await api.post(`/leads/${encodeURIComponent(leadId)}/pin`);
};

export const unpinLead = async (leadId: string): Promise<void> => {
  await api.delete(`/leads/${encodeURIComponent(leadId)}/pin`);
};
