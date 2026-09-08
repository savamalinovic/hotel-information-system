import axiosInstance from "@/src/api/axiosInstance";
import {
  AttendanceSession,
  AvailabilityOverride,
  LeaveRequest,
  PageResponse,
  WorkerAvailability,
} from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";

export type WorkforcePageFilters = { page: number; size: number; sort: string };
export type CreateAvailabilityOverrideRequest = { startsAt?: string; endsAt?: string; reason: string };
export type CreateLeaveRequest = { startDate: string; endDate: string; reason: string };

export const workforceQueryKeys = {
  root: ["workforce"] as const,
  availability: ["workforce", "availability"] as const,
  attendance: (filters: Omit<WorkforcePageFilters, "page">) => ["workforce", "attendance", filters] as const,
  overrides: (filters: Omit<WorkforcePageFilters, "page">) => ["workforce", "overrides", filters] as const,
  leaveRequests: (filters: Omit<WorkforcePageFilters, "page">) => ["workforce", "leave-requests", filters] as const,
};

export const workforceService = {
  getAvailability: async (): Promise<WorkerAvailability> => {
    const response = await axiosInstance.get<WorkerAvailability>(API_URLS.workforce.availability);
    return response.data;
  },
  clockIn: async (): Promise<WorkerAvailability> => (await axiosInstance.post<WorkerAvailability>(API_URLS.workforce.clockIn)).data,
  startBreak: async (): Promise<WorkerAvailability> => (await axiosInstance.post<WorkerAvailability>(API_URLS.workforce.startBreak)).data,
  endBreak: async (): Promise<WorkerAvailability> => (await axiosInstance.post<WorkerAvailability>(API_URLS.workforce.endBreak)).data,
  clockOut: async (): Promise<WorkerAvailability> => (await axiosInstance.post<WorkerAvailability>(API_URLS.workforce.clockOut)).data,
  getAttendance: async (filters: WorkforcePageFilters): Promise<PageResponse<AttendanceSession>> => (
    await axiosInstance.get<PageResponse<AttendanceSession>>(API_URLS.workforce.attendanceSessions, { params: filters })
  ).data,
  getOverrides: async (filters: WorkforcePageFilters): Promise<PageResponse<AvailabilityOverride>> => (
    await axiosInstance.get<PageResponse<AvailabilityOverride>>(API_URLS.workforce.overrides, { params: filters })
  ).data,
  createOverride: async (request: CreateAvailabilityOverrideRequest): Promise<AvailabilityOverride> => (
    await axiosInstance.post<AvailabilityOverride>(API_URLS.workforce.overrides, request)
  ).data,
  clearOverride: async (overrideId: number): Promise<AvailabilityOverride> => (
    await axiosInstance.post<AvailabilityOverride>(API_URLS.workforce.clearOverride(overrideId))
  ).data,
  getLeaveRequests: async (filters: WorkforcePageFilters): Promise<PageResponse<LeaveRequest>> => (
    await axiosInstance.get<PageResponse<LeaveRequest>>(API_URLS.workforce.leaveRequests, { params: filters })
  ).data,
  createLeaveRequest: async (request: CreateLeaveRequest): Promise<LeaveRequest> => (
    await axiosInstance.post<LeaveRequest>(API_URLS.workforce.leaveRequests, request)
  ).data,
  cancelLeaveRequest: async (requestId: number): Promise<LeaveRequest> => (
    await axiosInstance.post<LeaveRequest>(API_URLS.workforce.cancelLeaveRequest(requestId))
  ).data,
};
