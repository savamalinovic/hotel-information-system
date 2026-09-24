import {
  damageService,
  DamageListFilters,
  DamageUploadFile,
  damageWorkflowQueryKeys,
} from "@/src/api/services/damageService";
import { CreateDamageRequest, DamageResponse } from "@/src/types/types";
import { isAxiosError } from "axios";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { parsePositiveId, requirePositiveId } from "@/src/util/idParams";

export const useDamages = (
  apartmentId: number | null | undefined,
  filters: Omit<DamageListFilters, "page"> = { size: 20 }
) => {
  const validApartmentId = parsePositiveId(apartmentId);
  const query = useInfiniteQuery({
    queryKey: damageWorkflowQueryKeys.list(validApartmentId ?? 0, filters),
    queryFn: ({ pageParam }) => damageService.getDamages(requirePositiveId(apartmentId), { ...filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: validApartmentId !== null,
    retry: 1,
  });
  const damages = useMemo(
    () => query.data?.pages.flatMap((page) => page.content) ?? [],
    [query.data]
  );
  return { ...query, damages };
};

export const useDamageDetail = (apartmentId: number | null | undefined, damageId: number | null | undefined, enabled = true) => {
  const validApartmentId = parsePositiveId(apartmentId);
  const validDamageId = parsePositiveId(damageId);

  return useQuery({
    queryKey: damageWorkflowQueryKeys.detail(validApartmentId ?? 0, validDamageId ?? 0),
    queryFn: () => damageService.getDamage(requirePositiveId(apartmentId), requirePositiveId(damageId)),
    enabled: enabled && validApartmentId !== null && validDamageId !== null,
    retry: 1,
  });
};

export const useDamageAttachments = (apartmentId: number | null | undefined, damageId: number | null | undefined, enabled = true) => {
  const validApartmentId = parsePositiveId(apartmentId);
  const validDamageId = parsePositiveId(damageId);

  return useQuery({
    queryKey: damageWorkflowQueryKeys.attachments(validApartmentId ?? 0, validDamageId ?? 0),
    queryFn: () => damageService.getAttachments(requirePositiveId(apartmentId), requirePositiveId(damageId)),
    enabled: enabled && validApartmentId !== null && validDamageId !== null,
    retry: 1,
  });
};

export const useCreateDamage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ apartmentId, request }: { apartmentId: number; request: CreateDamageRequest }) =>
      damageService.create(requirePositiveId(apartmentId), request),
    onSuccess: async (damage: DamageResponse) => {
      queryClient.setQueryData(damageWorkflowQueryKeys.detail(damage.apartmentId, damage.damageId), damage);
      await queryClient.invalidateQueries({ queryKey: damageWorkflowQueryKeys.list(damage.apartmentId, { size: 20 }) });
    },
    onError: (error, variables) =>
      isAxiosError(error) && error.response?.status === 409
        ? queryClient.invalidateQueries({ queryKey: damageWorkflowQueryKeys.list(variables.apartmentId, { size: 20 }) })
        : Promise.resolve(),
  });
};

export const useUploadDamageAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ apartmentId, damageId, file }: { apartmentId: number; damageId: number; file: DamageUploadFile }) =>
      damageService.uploadAttachment(requirePositiveId(apartmentId), requirePositiveId(damageId), file),
    onSuccess: async (_attachment, variables) => {
      await queryClient.invalidateQueries({
        queryKey: damageWorkflowQueryKeys.attachments(variables.apartmentId, variables.damageId),
      });
    },
    onError: (error, variables) =>
      isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404)
        ? queryClient.invalidateQueries({ queryKey: damageWorkflowQueryKeys.root })
        : Promise.resolve(),
  });
};
