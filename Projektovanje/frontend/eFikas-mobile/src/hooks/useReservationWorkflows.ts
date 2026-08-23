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
import { parsePositiveId, requirePositiveId } from "@/src/util/idParams";

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

export const useReservationDetail = (reservationId: number | null | undefined) => {
  const validReservationId = parsePositiveId(reservationId);

  return useQuery({
    queryKey: reservationWorkflowQueryKeys.reservation(validReservationId ?? 0),
    queryFn: () => reservationWorkflowService.getReservation(requirePositiveId(reservationId)),
    enabled: validReservationId !== null,
    retry: 1,
  });
};

export const useReservationStatusHistory = (reservationId: number | null | undefined) => {
  const validReservationId = parsePositiveId(reservationId);

  return useQuery({
    queryKey: reservationWorkflowQueryKeys.statusHistory(validReservationId ?? 0),
    queryFn: () => reservationWorkflowService.getStatusHistory(requirePositiveId(reservationId)),
    enabled: validReservationId !== null,
    retry: 1,
  });
};

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
      reservationWorkflowService.updateStay(requirePositiveId(reservationId), request),
    onSuccess: () => invalidateReservationData(queryClient),
  });
};

export const useUpdateReservationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, request }: { reservationId: number; request: ReservationStatusUpdateRequest }) =>
      reservationWorkflowService.updateStatus(requirePositiveId(reservationId), request),
    onSuccess: () => invalidateReservationData(queryClient),
  });
};
