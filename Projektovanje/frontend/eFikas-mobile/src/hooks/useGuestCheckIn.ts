import {
  guestCheckInQueryKeys,
  GuestSearchFilters,
  guestCheckInService,
} from "@/src/api/services/guestCheckInService";
import { reservationWorkflowQueryKeys } from "@/src/api/services/reservationWorkflowService";
import {
  AddReservationGuestRequest,
  UpdateReservationGuestRequest,
} from "@/src/types/types";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

const useDebouncedValue = (value: string, delay = 350) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
};

const refreshReservationDependencies = async (
  queryClient: ReturnType<typeof useQueryClient>,
  reservationId: number,
  reloadReservation = false
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: guestCheckInQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: guestCheckInQueryKeys.reservationGuests(reservationId) }),
    queryClient.invalidateQueries({ queryKey: guestCheckInQueryKeys.claimHistory(reservationId) }),
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.reservation(reservationId) }),
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.statusHistory(reservationId) }),
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: ["apartment-catalog"] }),
    queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] }),
  ]);

  if (reloadReservation) {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: guestCheckInQueryKeys.reservationGuests(reservationId) }),
      queryClient.refetchQueries({ queryKey: guestCheckInQueryKeys.claimHistory(reservationId) }),
      queryClient.refetchQueries({ queryKey: reservationWorkflowQueryKeys.reservation(reservationId) }),
    ]);
  }
};

export const useReservationGuests = (reservationId: number) =>
  useQuery({
    queryKey: guestCheckInQueryKeys.reservationGuests(reservationId),
    queryFn: () => guestCheckInService.getReservationGuests(reservationId),
    enabled: Number.isInteger(reservationId) && reservationId > 0,
    retry: 1,
  });

export const useGuestDetail = (guestId: number) =>
  useQuery({
    queryKey: guestCheckInQueryKeys.guest(guestId),
    queryFn: () => guestCheckInService.getGuest(guestId),
    enabled: Number.isInteger(guestId) && guestId > 0,
    retry: 1,
  });

export const useGuestSearch = (query: string) => {
  const debouncedQuery = useDebouncedValue(query.trim());
  const filters = useMemo<Omit<GuestSearchFilters, "page">>(
    () => ({ query: debouncedQuery, size: 20, sort: "surname,asc" }),
    [debouncedQuery]
  );
  const result = useInfiniteQuery({
    queryKey: guestCheckInQueryKeys.guestSearch(filters),
    queryFn: ({ pageParam }) => guestCheckInService.getGuests({ ...filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: debouncedQuery.length > 0,
    retry: 1,
  });
  const guests = useMemo(() => result.data?.pages.flatMap((page) => page.content) ?? [], [result.data]);

  return { ...result, guests, debouncedQuery };
};

export const useAddReservationGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, request }: { reservationId: number; request: AddReservationGuestRequest }) =>
      guestCheckInService.addReservationGuest(reservationId, request),
    onSuccess: (_response, variables) => refreshReservationDependencies(queryClient, variables.reservationId),
  });
};

export const useUpdateReservationGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, guestId, request }: {
      reservationId: number;
      guestId: number;
      request: UpdateReservationGuestRequest;
    }) => guestCheckInService.updateReservationGuest(reservationId, guestId, request),
    onSuccess: (_response, variables) => refreshReservationDependencies(queryClient, variables.reservationId),
  });
};

export const useRemoveReservationGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, guestId }: { reservationId: number; guestId: number }) =>
      guestCheckInService.removeReservationGuest(reservationId, guestId),
    onSuccess: (_response, variables) => refreshReservationDependencies(queryClient, variables.reservationId, true),
  });
};

const useClaimMutation = (action: "claim" | "release" | "takeover") => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: number) => guestCheckInService[action](reservationId),
    onSuccess: (_response, reservationId) => refreshReservationDependencies(queryClient, reservationId, true),
  });
};

export const useClaimCheckIn = () => useClaimMutation("claim");
export const useReleaseCheckIn = () => useClaimMutation("release");
export const useTakeoverCheckIn = () => useClaimMutation("takeover");

export const useCheckInClaimHistory = (reservationId: number) =>
  useQuery({
    queryKey: guestCheckInQueryKeys.claimHistory(reservationId),
    queryFn: () => guestCheckInService.getClaimHistory(reservationId),
    enabled: Number.isInteger(reservationId) && reservationId > 0,
    retry: 1,
  });

export const usePerformCheckIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: number) => guestCheckInService.checkIn(reservationId),
    onSuccess: (_response, reservationId) => refreshReservationDependencies(queryClient, reservationId, true),
  });
};
