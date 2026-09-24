import axiosInstance from "@/src/api/axiosInstance";
import {
  ApartmentDetails,
  ApartmentOperationalStatus,
  ApartmentStatusHistory,
  ApartmentType,
  ApartmentUnavailability,
  PageResponse,
} from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";

export type ApartmentCatalogFilters = {
  apartmentTypeId?: number;
  status?: ApartmentOperationalStatus;
  active: true;
  outOfOrder?: true;
  page: number;
  size: number;
  sort: "name,asc";
};

export type ApartmentTypeFilters = {
  active: true;
  page: number;
  size: number;
  sort: "name,asc";
};

export const apartmentCatalogQueryKeys = {
  apartmentTypes: (filters: ApartmentTypeFilters) => ["apartment-catalog", "types", filters] as const,
  apartments: (filters: Omit<ApartmentCatalogFilters, "page">) => ["apartment-catalog", "list", filters] as const,
  apartment: (apartmentId: number) => ["apartment-catalog", "detail", apartmentId] as const,
  statusHistory: (apartmentId: number) => ["apartment-catalog", "status-history", apartmentId] as const,
  unavailability: (apartmentId: number) => ["apartment-catalog", "unavailability", apartmentId] as const,
};

export const apartmentCatalogService = {
  getApartmentTypes: async (filters: ApartmentTypeFilters): Promise<PageResponse<ApartmentType>> => {
    const response = await axiosInstance.get<PageResponse<ApartmentType>>(API_URLS.apartmentTypes.list, {
      params: filters,
    });
    return response.data;
  },

  getApartments: async (filters: ApartmentCatalogFilters): Promise<PageResponse<ApartmentDetails>> => {
    const response = await axiosInstance.get<PageResponse<ApartmentDetails>>(API_URLS.apartments.list, {
      params: filters,
    });
    return response.data;
  },

  getApartment: async (apartmentId: number): Promise<ApartmentDetails> => {
    const response = await axiosInstance.get<ApartmentDetails>(API_URLS.apartments.getById(apartmentId));
    return response.data;
  },

  getStatusHistory: async (apartmentId: number): Promise<ApartmentStatusHistory[]> => {
    const response = await axiosInstance.get<ApartmentStatusHistory[]>(
      API_URLS.apartments.statusHistory(apartmentId)
    );
    return response.data;
  },

  getUnavailability: async (apartmentId: number): Promise<ApartmentUnavailability[]> => {
    const response = await axiosInstance.get<ApartmentUnavailability[]>(
      API_URLS.apartments.unavailability(apartmentId)
    );
    return response.data;
  },
};
