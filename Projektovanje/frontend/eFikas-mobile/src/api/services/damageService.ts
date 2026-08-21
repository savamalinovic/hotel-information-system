import axiosInstance from "@/src/api/axiosInstance";
import {
  CreateDamageRequest,
  ApartmentDamageDTO,
  DamageAttachmentResponse,
  DamageResponse,
  PageResponse,
} from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";

export type DamageListFilters = {
  page: number;
  size: number;
  sort?: string;
};

export type DamageUploadFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  file?: Blob;
};

const decimalStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const normalizeDamage = (
  damage: Omit<DamageResponse, "estimatedAmount" | "confirmedAmount"> & { estimatedAmount: string | number | null; confirmedAmount: string | number | null }
): DamageResponse => ({
  ...damage,
  estimatedAmount: decimalStringOrNull(damage.estimatedAmount),
  confirmedAmount: decimalStringOrNull(damage.confirmedAmount),
});

export const damageWorkflowQueryKeys = {
  root: ["damage-workflows"] as const,
  list: (apartmentId: number, filters: Omit<DamageListFilters, "page">) => ["damage-workflows", "list", apartmentId, filters] as const,
  detail: (apartmentId: number, damageId: number) => ["damage-workflows", "detail", apartmentId, damageId] as const,
  attachments: (apartmentId: number, damageId: number) => ["damage-workflows", "attachments", apartmentId, damageId] as const,
};

export const damageService = {
  getDamages: async (apartmentId: number, filters: DamageListFilters): Promise<PageResponse<DamageResponse>> => {
    const response = await axiosInstance.get<PageResponse<Omit<DamageResponse, "estimatedAmount" | "confirmedAmount"> & { estimatedAmount: string | number | null; confirmedAmount: string | number | null }>>(
      API_URLS.damageWorkflows.list(apartmentId),
      { params: filters }
    );
    return { ...response.data, content: response.data.content.map(normalizeDamage) };
  },

  getDamage: async (apartmentId: number, damageId: number): Promise<DamageResponse> => {
    const response = await axiosInstance.get<Omit<DamageResponse, "estimatedAmount" | "confirmedAmount"> & { estimatedAmount: string | number | null; confirmedAmount: string | number | null }>(
      API_URLS.damageWorkflows.detail(apartmentId, damageId)
    );
    return normalizeDamage(response.data);
  },

  create: async (apartmentId: number, request: CreateDamageRequest): Promise<DamageResponse> => {
    const response = await axiosInstance.post<Omit<DamageResponse, "estimatedAmount" | "confirmedAmount"> & { estimatedAmount: string | number | null; confirmedAmount: string | number | null }>(
      API_URLS.damageWorkflows.list(apartmentId),
      request
    );
    return normalizeDamage(response.data);
  },

  getAttachments: async (apartmentId: number, damageId: number): Promise<DamageAttachmentResponse[]> => {
    const response = await axiosInstance.get<DamageAttachmentResponse[]>(API_URLS.damageWorkflows.attachments(apartmentId, damageId));
    return response.data;
  },

  uploadAttachment: async (apartmentId: number, damageId: number, attachment: DamageUploadFile): Promise<DamageAttachmentResponse> => {
    const formData = new FormData();
    const filePart = attachment.file ?? {
      uri: attachment.uri,
      name: attachment.name,
      type: attachment.mimeType ?? "application/octet-stream",
    };
    formData.append("file", filePart as unknown as Blob);
    const response = await axiosInstance.post<DamageAttachmentResponse>(
      API_URLS.damageWorkflows.attachments(apartmentId, damageId),
      formData,
      { timeout: 60_000 }
    );
    return response.data;
  },

  getByApartment: async (apartmentId: number): Promise<ApartmentDamageDTO[]> => {
    const response = await axiosInstance.get<ApartmentDamageDTO[]>(`/apartments/${apartmentId}/damages`);
    return response.data;
  },
};
