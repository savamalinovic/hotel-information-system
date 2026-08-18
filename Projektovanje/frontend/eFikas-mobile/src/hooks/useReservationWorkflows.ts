import {
  ReservationAvailabilityFilters,
  ReservationListFilters,
  reservationWorkflowQueryKeys,
  reservationWorkflowService,
} from "@/src/api/services/reservationWorkflowService";
import {
  ReservationCreateRequest,
  ReservationStatusUpdateRequest,
  ReservationStayUpdateRequest,
} from "@/src/types/types";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

const invalidateReservationData = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] }),
  ]);
};

export const useReservationList = (filters: Omit<ReservationListFilters, "page">) => {
  const query = useInfiniteQuery({
    queryKey: reservationWorkflowQueryKeys.reservations(filters),
    queryFn: ({ pageParam }) => reservationWorkflowService.getReservations({ ...filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    retry: 1,
  });

  const reservations = useMemo(
    () => query.data?.pages.flatMap((page) => page.content) ?? [],
    [query.data]
  );

  return { ...query, reservations };
};

export const useReservationAvailability = (
  filters: Omit<ReservationAvailabilityFilters, "page">,
  enabled: boolean
) => {
  const query = useInfiniteQuery({
    queryKey: reservationWorkflowQueryKeys.availability(filters),
    queryFn: ({ pageParam }) => reservationWorkflowService.getAvailability({ ...filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled,
    retry: 1,
  });

  const apartments = useMemo(
    () => query.data?.pages.flatMap((page) => page.content) ?? [],
    [query.data]
  );

  return { ...query, apartments };
};

export const useReservationDetail = (reservationId: number) =>
  useQuery({
    queryKey: reservationWorkflowQueryKeys.reservation(reservationId),
    queryFn: () => reservationWorkflowService.getReservation(reservationId),
    enabled: Number.isInteger(reservationId) && reservationId > 0,
    retry: 1,
  });

export const useReservationStatusHistory = (reservationId: number) =>
  useQuery({
    queryKey: reservationWorkflowQueryKeys.statusHistory(reservationId),
    queryFn: () => reservationWorkflowService.getStatusHistory(reservationId),
    enabled: Number.isInteger(reservationId) && reservationId > 0,
    retry: 1,
  });

export const useCreateReservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ReservationCreateRequest) => reservationWorkflowService.createReservation(request),
    onSuccess: () => invalidateReservationData(queryClient),
  });
};

export const useUpdateReservationStay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, request }: { reservationId: number; request: ReservationStayUpdateRequest }) =>
      reservationWorkflowService.updateStay(reservationId, request),
    onSuccess: () => invalidateReservationData(queryClient),
  });
};

export const useUpdateReservationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, request }: { reservationId: number; request: ReservationStatusUpdateRequest }) =>
      reservationWorkflowService.updateStatus(reservationId, request),
    onSuccess: () => invalidateReservationData(queryClient),
  });
};
