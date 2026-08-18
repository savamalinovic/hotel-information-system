import axiosInstance from "@/src/api/axiosInstance";
import {
  AvailableApartment,
  PageResponse,
  ReservationCreateRequest,
  ReservationDetails,
  ReservationStatus,
  ReservationStatusHistory,
  ReservationStatusUpdateRequest,
  ReservationStayUpdateRequest,
} from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";

export type ReservationListFilters = {
  apartmentId?: number;
  status?: ReservationStatus;
  from?: string;
  to?: string;
  page: number;
  size: number;
  sort: "checkInDate,asc";
};

export type ReservationAvailabilityFilters = {
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  apartmentTypeId?: number;
  page: number;
  size: number;
  sort: "name,asc";
};

export const reservationWorkflowQueryKeys = {
  root: ["reservation-workflows"] as const,
  reservations: (filters: Omit<ReservationListFilters, "page">) =>
    ["reservation-workflows", "list", filters] as const,
  availability: (filters: Omit<ReservationAvailabilityFilters, "page">) =>
    ["reservation-workflows", "availability", filters] as const,
  reservation: (reservationId: number) => ["reservation-workflows", "detail", reservationId] as const,
  statusHistory: (reservationId: number) =>
    ["reservation-workflows", "status-history", reservationId] as const,
};

export const reservationWorkflowService = {
  getReservations: async (filters: ReservationListFilters): Promise<PageResponse<ReservationDetails>> => {
    const response = await axiosInstance.get<PageResponse<ReservationDetails>>(API_URLS.reservationWorkflows.list, {
      params: filters,
    });
    return response.data;
  },

  getAvailability: async (
    filters: ReservationAvailabilityFilters
  ): Promise<PageResponse<AvailableApartment>> => {
    const response = await axiosInstance.get<PageResponse<AvailableApartment>>(
      API_URLS.reservationWorkflows.availability,
      { params: filters }
    );
    return response.data;
  },

  getReservation: async (reservationId: number): Promise<ReservationDetails> => {
    const response = await axiosInstance.get<ReservationDetails>(API_URLS.reservationWorkflows.byId(reservationId));
    return response.data;
  },

  getStatusHistory: async (reservationId: number): Promise<ReservationStatusHistory[]> => {
    const response = await axiosInstance.get<ReservationStatusHistory[]>(
      API_URLS.reservationWorkflows.statusHistory(reservationId)
    );
    return response.data;
  },

  createReservation: async (request: ReservationCreateRequest): Promise<ReservationDetails> => {
    const response = await axiosInstance.post<ReservationDetails>(API_URLS.reservationWorkflows.list, request);
    return response.data;
  },

  updateStay: async (
    reservationId: number,
    request: ReservationStayUpdateRequest
  ): Promise<ReservationDetails> => {
    const response = await axiosInstance.patch<ReservationDetails>(
      API_URLS.reservationWorkflows.stay(reservationId),
      request
    );
    return response.data;
  },

  updateStatus: async (
    reservationId: number,
    request: ReservationStatusUpdateRequest
  ): Promise<ReservationDetails> => {
    const response = await axiosInstance.patch<ReservationDetails>(
      API_URLS.reservationWorkflows.status(reservationId),
      request
    );
    return response.data;
  },
};
