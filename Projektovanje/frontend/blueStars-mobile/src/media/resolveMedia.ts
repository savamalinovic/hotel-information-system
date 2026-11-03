import { apartmentCatalogService } from "@/src/api/services/apartmentCatalogService";
import { taskWorkflowService } from "@/src/api/services/taskWorkflowService";
import { damageService } from "@/src/api/services/damageService";
import { API_BASE_URL } from "@/src/util/apiConstants";
import { getMediaKind, requireMediaUrl } from "./mediaPolicy";

const configuredApi = new URL(API_BASE_URL);
const developmentHost = configuredApi.protocol === "http:" ? configuredApi.hostname : undefined;

export type MediaResource =
  | { type: "apartment"; apartmentId: number; pictureId: number; title: string }
  | { type: "task"; taskId: number; attachmentId: number; title: string }
  | { type: "damage"; apartmentId: number; damageId: number; attachmentId: number; title: string };

// Reauthorize and reacquire the private URL on every open/retry. Never put URLs in routes or storage.
export async function resolveMedia(resource: MediaResource) {
  if (resource.type === "apartment") {
    const apartment = await apartmentCatalogService.getApartment(resource.apartmentId);
    const picture = apartment.pictures.find((item) => item.pictureId === resource.pictureId);
    if (!picture) throw new Error("Media unavailable.");
    return { uri: requireMediaUrl(picture.url, developmentHost), kind: "image" as const };
  }
  const attachments = resource.type === "task"
    ? await taskWorkflowService.getAttachments(resource.taskId)
    : await damageService.getAttachments(resource.apartmentId, resource.damageId);
  const attachment = attachments.find((item) => ("damageAttachmentId" in item ? item.damageAttachmentId : item.id) === resource.attachmentId);
  if (!attachment) throw new Error("Media unavailable.");
  return { uri: requireMediaUrl(attachment.downloadUrl, developmentHost), kind: getMediaKind(attachment.contentType, attachment.originalName) };
}
