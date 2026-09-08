
import { settingsService } from "@/src/api/services/settingsService";
import { Theme, useTheme } from "@/src/providers/ThemeProvider";
import { toastService } from "@/src/services/toastService";
import { AppErrorDTO, MenuSectionProps } from "@/src/types/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageDialog } from "../../organisms/Dialogs/LanguageDialog/LanguageDialog";
import { ReportDialog } from "../../organisms/Dialogs/ReportDialog/ReportDialog";
import { ThemeDialog } from "../../organisms/Dialogs/ThemeDialog/ThemeDialog";
import SettingsTemplate from "../../templates/SettingsTemplate/SettingsTemplate";


export default function SettingsScreen() {
    const [languageDialogVisible, setLanguageDialogVisible] = useState(false);
    const [themeDialogVisible, setThemeDialogVisible] = useState(false);
    const [reportDialogVisible, setReportDialogVisible] = useState(false);

    const { t, i18n } = useTranslation();
    const { toggleTheme } = useTheme();

    const onLanguageChange = (languageId: string) => {
        i18n.changeLanguage(languageId);  // update app language
        console.log("Language changed to: ", languageId);
    }

    const onThemeChange = (selectedTheme: Theme) => {
        toggleTheme(selectedTheme);    // UI state
        //setColorMode('Light'); // Gluestack theme switching
        console.log("Theme changed to: ", selectedTheme);
    };

    const onErrorReportSubmit = async (appErrorText: string) => {
		try {
			const request: AppErrorDTO = {
				note: appErrorText
			};

			const response = await settingsService.registerAppError(request);

			if(response.status !== 200) {
				throw new Error("Greska prilikom dodavanja prijave o grešci.");
			}

			toastService.success(t('menu.mainSettings.settings.feedback.successfulFeedbackTitle'), t('menu.mainSettings.settings.feedback.successfulFeedbackMessage'));
		} catch(err) {
			toastService.error(t('common.errors.networkErrorTitle'), t('common.errors.networkErrorMessage'));
			console.log(err);
		}
    }


    const MENU_SECTIONS: MenuSectionProps[] = [
        {
            title: t('menu.mainSettings.settings.general.mainTitle'),
            items: [
                { id: "language", icon: "Languages", text: t('menu.mainSettings.settings.general.languageTitle'), onPressMenuItem: () => setLanguageDialogVisible(true), },
                { id: "theme", icon: "SunMoon", text: t('menu.mainSettings.settings.general.themeTitle'), onPressMenuItem: () => setThemeDialogVisible(true), },

            ],
        },
        {
            title: t('menu.mainSettings.settings.feedback.mainTitle'),
            items: [
                { id: "bugReport", icon: "TriangleAlert", text: t('menu.mainSettings.settings.feedback.bugReportTitle'), onPressMenuItem: () => setReportDialogVisible(true), },
            ]
        },
    ];

    return (
        <>
            <SettingsTemplate 
                sections={MENU_SECTIONS}
            />

            <LanguageDialog     
                visible={languageDialogVisible} 
                onClose={() => setLanguageDialogVisible(false)} 
                onConfirm={onLanguageChange} 
                selectedLanguage={'sr'} 
            />

            <ThemeDialog 
                visible={themeDialogVisible} 
                onClose={() => setThemeDialogVisible(false)} 
                onConfirm={onThemeChange}            
            />

            <ReportDialog 
                visible={reportDialogVisible} 
                onCancel={() => setReportDialogVisible(false)} 
                onSubmit={(text: string) => onErrorReportSubmit(text)}            
            />
        </>
        
    );
}