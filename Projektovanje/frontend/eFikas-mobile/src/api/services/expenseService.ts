import axiosInstance from "@/src/api/axiosInstance";
import {
  CreateOperationalExpenseRequest,
  ExpenseCategoryResponse,
  OperationalExpenseResponse,
  PageResponse,
  ApartmentExpenseDTO,
} from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";

export type ExpenseListFilters = {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: number;
  createdBy?: number;
  voided?: boolean;
  page: number;
  size: number;
  sort?: string;
};

export type ExpenseCategoryFilters = {
  active: true;
  page: number;
  size: number;
  sort?: string;
};

const decimalString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "0";
};

const normalizeExpense = (expense: Omit<OperationalExpenseResponse, "amount"> & { amount: string | number }): OperationalExpenseResponse => ({
  ...expense,
  amount: decimalString(expense.amount),
});

const normalizePage = <TInput, TOutput>(page: PageResponse<TInput>, map: (item: TInput) => TOutput): PageResponse<TOutput> => ({
  ...page,
  content: page.content.map(map),
});

export const operationalExpenseQueryKeys = {
  root: ["operational-expenses"] as const,
  categories: (filters: ExpenseCategoryFilters) => ["operational-expenses", "categories", filters] as const,
  list: (filters: Omit<ExpenseListFilters, "page">) => ["operational-expenses", "list", filters] as const,
  detail: (expenseId: number) => ["operational-expenses", "detail", expenseId] as const,
};

export const expenseService = {
  getCategories: async (filters: ExpenseCategoryFilters): Promise<PageResponse<ExpenseCategoryResponse>> => {
    const response = await axiosInstance.get<PageResponse<ExpenseCategoryResponse>>(API_URLS.operationalExpenses.categories, { params: filters });
    return response.data;
  },

  getExpenses: async (filters: ExpenseListFilters): Promise<PageResponse<OperationalExpenseResponse>> => {
    const response = await axiosInstance.get<PageResponse<Omit<OperationalExpenseResponse, "amount"> & { amount: string | number }>>(
      API_URLS.operationalExpenses.list,
      { params: filters }
    );
    return normalizePage(response.data, normalizeExpense);
  },

  getExpense: async (expenseId: number): Promise<OperationalExpenseResponse> => {
    const response = await axiosInstance.get<Omit<OperationalExpenseResponse, "amount"> & { amount: string | number }>(
      API_URLS.operationalExpenses.detail(expenseId)
    );
    return normalizeExpense(response.data);
  },

  create: async (request: CreateOperationalExpenseRequest): Promise<OperationalExpenseResponse> => {
    const response = await axiosInstance.post<Omit<OperationalExpenseResponse, "amount"> & { amount: string | number }>(
      API_URLS.operationalExpenses.list,
      request
    );
    return normalizeExpense(response.data);
  },

  getByApartment: async (apartmentId: number): Promise<ApartmentExpenseDTO[]> => {
    const response = await axiosInstance.get<ApartmentExpenseDTO[]>(`/apartments/${apartmentId}/expenses`);
    return response.data;
  },
};
