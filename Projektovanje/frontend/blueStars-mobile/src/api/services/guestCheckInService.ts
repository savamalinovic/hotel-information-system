import axiosInstance from "@/src/api/axiosInstance";
import {
  AddReservationGuestRequest,
  CheckInClaimHistoryResponse,
  CheckInClaimResponse,
  CheckInResponse,
  Guest,
  PageResponse,
  ReservationGuest,
  UpdateReservationGuestRequest,
} from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";

export type GuestSearchFilters = {
  query: string;
  page: number;
  size: number;
  sort: "surname,asc";
};

export const guestCheckInQueryKeys = {
  root: ["guest-check-in"] as const,
  reservationGuests: (reservationId: number) => ["guest-check-in", "reservation-guests", reservationId] as const,
  guestSearch: (filters: Omit<GuestSearchFilters, "page">) =>
    ["guest-check-in", "guest-search", filters] as const,
  guest: (guestId: number) => ["guest-check-in", "guest", guestId] as const,
  claimHistory: (reservationId: number) => ["guest-check-in", "claim-history", reservationId] as const,
};

export const guestCheckInService = {
  getGuests: async (filters: GuestSearchFilters): Promise<PageResponse<Guest>> => {
    const response = await axiosInstance.get<PageResponse<Guest>>(API_URLS.guestCheckIn.guests, { params: filters });
    return response.data;
  },

  getGuest: async (guestId: number): Promise<Guest> => {
    const response = await axiosInstance.get<Guest>(API_URLS.guestCheckIn.guest(guestId));
    return response.data;
  },

  getReservationGuests: async (reservationId: number): Promise<ReservationGuest[]> => {
    const response = await axiosInstance.get<ReservationGuest[]>(API_URLS.guestCheckIn.reservationGuests(reservationId));
    return response.data;
  },

  addReservationGuest: async (
    reservationId: number,
    request: AddReservationGuestRequest
  ): Promise<ReservationGuest> => {
    const response = await axiosInstance.post<ReservationGuest>(
      API_URLS.guestCheckIn.reservationGuests(reservationId),
      request
    );
    return response.data;
  },

  updateReservationGuest: async (
    reservationId: number,
    guestId: number,
    request: UpdateReservationGuestRequest
  ): Promise<ReservationGuest> => {
    const response = await axiosInstance.put<ReservationGuest>(
      API_URLS.guestCheckIn.reservationGuest(reservationId, guestId),
      request
    );
    return response.data;
  },

  removeReservationGuest: async (reservationId: number, guestId: number): Promise<void> => {
    await axiosInstance.delete(API_URLS.guestCheckIn.reservationGuest(reservationId, guestId));
  },

  claim: async (reservationId: number): Promise<CheckInClaimResponse> => {
    const response = await axiosInstance.post<CheckInClaimResponse>(API_URLS.guestCheckIn.claim(reservationId));
    return response.data;
  },

  release: async (reservationId: number): Promise<CheckInClaimResponse> => {
    const response = await axiosInstance.delete<CheckInClaimResponse>(API_URLS.guestCheckIn.claim(reservationId));
    return response.data;
  },

  takeover: async (reservationId: number): Promise<CheckInClaimResponse> => {
    const response = await axiosInstance.put<CheckInClaimResponse>(API_URLS.guestCheckIn.claim(reservationId));
    return response.data;
  },

  getClaimHistory: async (reservationId: number): Promise<CheckInClaimHistoryResponse[]> => {
    const response = await axiosInstance.get<CheckInClaimHistoryResponse[]>(
      API_URLS.guestCheckIn.claimHistory(reservationId)
    );
    return response.data;
  },

  checkIn: async (reservationId: number): Promise<CheckInResponse> => {
    const response = await axiosInstance.post<CheckInResponse>(API_URLS.guestCheckIn.checkIn(reservationId));
    return response.data;
  },
};
