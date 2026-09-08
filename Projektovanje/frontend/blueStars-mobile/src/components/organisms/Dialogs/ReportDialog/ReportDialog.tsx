import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsDialog } from "../SettingsDialog/SettingsDialog";
import DescriptionBox from "@/src/components/atoms/DescriptionBox/DescriptionBox";
import { toastService } from "@/src/services/toastService";

interface ReportDialogProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({ visible, onCancel, onSubmit }) => {
  const { t } = useTranslation();
  // 1. Initialize state to hold the report text
  const [reportText, setReportText] = useState("");
  const [isInvalid, setIsInvalid] = useState(false);

  const handleConfirm = () => {
	if(!reportText || reportText.length === 0) {
		setIsInvalid(true);
		toastService.error(t('menu.mainSettings.settings.feedback.emptyFeedbackErrorTitle'), t('menu.mainSettings.settings.feedback.emptyFeedbackErrorMessage'))
		return;
	}

    onSubmit(reportText);
	setIsInvalid(false);
    setReportText(""); 
  };

  return (
    <SettingsDialog
      visible={visible}
      title={t("dialogs.report.title")}
      onClose={onCancel}
      onConfirm={handleConfirm}
    >
      <DescriptionBox
	  	isInvalid={isInvalid}
        size="md"
        placeholder={t("dialogs.report.placeholder")}
		value={reportText}
    	onChangeText={setReportText}
      />
    </SettingsDialog>
  );
};
