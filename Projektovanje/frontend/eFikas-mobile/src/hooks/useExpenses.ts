import {
  ExpenseCategoryFilters,
  ExpenseListFilters,
  expenseService,
  operationalExpenseQueryKeys,
} from "@/src/api/services/expenseService";
import { CreateOperationalExpenseRequest, OperationalExpenseResponse } from "@/src/types/types";
import { isAxiosError } from "axios";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

const isExpenseId = (expenseId: number) => Number.isInteger(expenseId) && expenseId > 0;

const activeCategoryFilters: ExpenseCategoryFilters = {
  active: true,
  page: 0,
  size: 100,
  sort: "name,asc",
};

export const useExpenseCategories = () =>
  useQuery({
    queryKey: operationalExpenseQueryKeys.categories(activeCategoryFilters),
    queryFn: () => expenseService.getCategories(activeCategoryFilters),
    staleTime: 60_000,
    retry: 1,
  });

export const useExpenses = (filters: Omit<ExpenseListFilters, "page">, enabled = true) => {
  const query = useInfiniteQuery({
    queryKey: operationalExpenseQueryKeys.list(filters),
    queryFn: ({ pageParam }) => expenseService.getExpenses({ ...filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled,
    retry: 1,
  });
  const expenses = useMemo(
    () => query.data?.pages.flatMap((page) => page.content) ?? [],
    [query.data]
  );
  return { ...query, expenses };
};

export const useExpenseDetail = (expenseId: number) =>
  useQuery({
    queryKey: operationalExpenseQueryKeys.detail(expenseId),
    queryFn: () => expenseService.getExpense(expenseId),
    enabled: isExpenseId(expenseId),
    retry: 1,
  });

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateOperationalExpenseRequest) => expenseService.create(request),
    onSuccess: async (expense: OperationalExpenseResponse) => {
      queryClient.setQueryData(operationalExpenseQueryKeys.detail(expense.operationalExpenseId), expense);
      await queryClient.invalidateQueries({ queryKey: operationalExpenseQueryKeys.root });
    },
    onError: (error) =>
      isAxiosError(error) && error.response?.status === 409
        ? queryClient.invalidateQueries({ queryKey: operationalExpenseQueryKeys.root })
        : Promise.resolve(),
  });
};
