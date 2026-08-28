import React from "react";
import DatePicker from "react-native-date-picker";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";

interface DateTimePickerProps {
	visible: boolean;
	initialValue: Date | null;
	timePicker?: boolean;
	onClose: () => void;
	onConfirm: (date: Date) => void;
	minimumDate?: Date;
	maximumDate?: Date;
}

const DateTimePicker = ({
	visible,
	initialValue,
	timePicker = true,
	onClose,
	onConfirm,
	minimumDate,
	maximumDate,
}: DateTimePickerProps) => {
	const { theme } = useTheme();
	const { i18n, t } = useTranslation();

	const getSafeDate = (d: Date | null | string | undefined): Date => {
		//console.log("FROM DATE PICKER 1: ", d);

		if (!d) return new Date();

		if (d instanceof Date) return d;

		// Handle LocalDate array: [year, month, day]
		if (Array.isArray(d) && d.length >= 3) {
			const [year, month, day] = d;
			return new Date(year, month - 1, day);
		}

		const parsed = new Date(d);
		return isNaN(parsed.getTime()) ? new Date() : parsed;
	};

	const [date, setDate] = React.useState(getSafeDate(initialValue));

	React.useEffect(() => {
		if (visible) {
			const date = getSafeDate(initialValue);
			//console.log("FROM DATE PICKER 2: ", date);
			setDate(date);
		}
	}, [visible, initialValue]);

	const handleConfirm = () => {
		onConfirm(date);
		onClose();
	};

	const getDatePickerLocale = () => {
		const currentLang = i18n.language;

		const localeMap: Record<string, string> = {
			'sr': 'sr-Latn',
			'en': 'en',
		};

		return localeMap[currentLang] || 'en';
	};

	const getPickerTheme = () => {
		if (theme === 'dark' || theme === 'light') {
			return theme;
		}
		return 'light';
	};

	const getTitle = () => {
		if (timePicker) {
			return t("datePicker.titleDateTime");
		}
		return t("datePicker.titleDateOnly");
	};

	return (
		<DatePicker
			modal
			open={visible}
			date={date}
			onDateChange={setDate}
			mode={timePicker ? "datetime" : "date"}
			minimumDate={minimumDate}
			maximumDate={maximumDate}
			onConfirm={handleConfirm}
			onCancel={onClose}
			locale={getDatePickerLocale()}
			title={getTitle()}
			confirmText={t("datePicker.common.confirm")}
			cancelText={t("datePicker.common.cancel")}
			theme={getPickerTheme()}
		/>
	);
};

export default DateTimePicker;
