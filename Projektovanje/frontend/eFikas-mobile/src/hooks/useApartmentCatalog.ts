import {
  ApartmentCatalogFilters,
  ApartmentTypeFilters,
  apartmentCatalogQueryKeys,
  apartmentCatalogService,
} from "@/src/api/services/apartmentCatalogService";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { parsePositiveId, requirePositiveId } from "@/src/util/idParams";

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

export const useApartmentCatalogDetail = (apartmentId: number | null | undefined) => {
  const validApartmentId = parsePositiveId(apartmentId);

  return useQuery({
    queryKey: apartmentCatalogQueryKeys.apartment(validApartmentId ?? 0),
    queryFn: () => apartmentCatalogService.getApartment(requirePositiveId(apartmentId)),
    enabled: validApartmentId !== null,
    retry: 1,
  });
};

export const useApartmentStatusHistory = (apartmentId: number | null | undefined) => {
  const validApartmentId = parsePositiveId(apartmentId);

  return useQuery({
    queryKey: apartmentCatalogQueryKeys.statusHistory(validApartmentId ?? 0),
    queryFn: () => apartmentCatalogService.getStatusHistory(requirePositiveId(apartmentId)),
    enabled: validApartmentId !== null,
    retry: 1,
  });
};

export const useApartmentUnavailability = (apartmentId: number | null | undefined) => {
  const validApartmentId = parsePositiveId(apartmentId);

  return useQuery({
    queryKey: apartmentCatalogQueryKeys.unavailability(validApartmentId ?? 0),
    queryFn: () => apartmentCatalogService.getUnavailability(requirePositiveId(apartmentId)),
    enabled: validApartmentId !== null,
    retry: 1,
  });
};
