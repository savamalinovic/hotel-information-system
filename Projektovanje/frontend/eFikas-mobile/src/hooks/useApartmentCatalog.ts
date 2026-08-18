import {
  ApartmentCatalogFilters,
  ApartmentTypeFilters,
  apartmentCatalogQueryKeys,
  apartmentCatalogService,
} from "@/src/api/services/apartmentCatalogService";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const apartmentTypeFilters: ApartmentTypeFilters = {
  active: true,
  page: 0,
  size: 100,
  sort: "name,asc",
};

export const useApartmentTypes = () =>
  useQuery({
    queryKey: apartmentCatalogQueryKeys.apartmentTypes(apartmentTypeFilters),
    queryFn: () => apartmentCatalogService.getApartmentTypes(apartmentTypeFilters),
    retry: 1,
    staleTime: 60_000,
  });

export const useApartmentCatalog = (filters: Omit<ApartmentCatalogFilters, "page">) => {
  const query = useInfiniteQuery({
    queryKey: apartmentCatalogQueryKeys.apartments(filters),
    queryFn: ({ pageParam }) => apartmentCatalogService.getApartments({ ...filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    retry: 1,
  });

  const apartments = useMemo(
    () => query.data?.pages.flatMap((page) => page.content) ?? [],
    [query.data]
  );

  return { ...query, apartments };
};

export const useApartmentCatalogDetail = (apartmentId: number) =>
  useQuery({
    queryKey: apartmentCatalogQueryKeys.apartment(apartmentId),
    queryFn: () => apartmentCatalogService.getApartment(apartmentId),
    enabled: Number.isInteger(apartmentId) && apartmentId > 0,
    retry: 1,
  });

export const useApartmentStatusHistory = (apartmentId: number) =>
  useQuery({
    queryKey: apartmentCatalogQueryKeys.statusHistory(apartmentId),
    queryFn: () => apartmentCatalogService.getStatusHistory(apartmentId),
    enabled: Number.isInteger(apartmentId) && apartmentId > 0,
    retry: 1,
  });

export const useApartmentUnavailability = (apartmentId: number) =>
  useQuery({
    queryKey: apartmentCatalogQueryKeys.unavailability(apartmentId),
    queryFn: () => apartmentCatalogService.getUnavailability(apartmentId),
    enabled: Number.isInteger(apartmentId) && apartmentId > 0,
    retry: 1,
  });
