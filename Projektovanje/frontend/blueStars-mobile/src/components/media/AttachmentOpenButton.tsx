import { useState } from "react";
import { useTranslation } from "react-i18next";
import { WorkflowButton } from "@/src/components/screens/TaskWorkflowScreen/TaskWorkflowUi";
import { MediaResource } from "@/src/media/resolveMedia";
import { MediaViewer } from "./MediaViewer";

export function AttachmentOpenButton({ resource }: { resource: MediaResource }) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState<MediaResource | null>(null);
  return <>
    <WorkflowButton label={t("mediaViewer.open")} onPress={() => setOpened(resource)} variant="secondary" icon="ChevronRight" />
    <MediaViewer resource={opened} onClose={() => setOpened(null)} />
  </>;
}
