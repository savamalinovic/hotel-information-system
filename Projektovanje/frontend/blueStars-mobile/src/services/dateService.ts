import dayjs from "dayjs";

export const dateService = {
    formatLocalDate: (date: Date): string => {
		const d = dateService.parseBackendDate(date);
        return dayjs(d).format('DD. MM. YYYY');
    },

	formatLocalDateTime: (date: Date): string => {
		const d = dateService.parseBackendDate(date);
        return dayjs(d).format('DD.MM.YYYY. HH:mm');
    },

    formatBackendDate: (date: Date): string => {
        return dayjs(date).format('YYYY-MM-DD');
    },

	parseBackendDate: (value: any): Date | null => {
		if (value == null) return null;

		// Already a Date
		if (value instanceof Date) {
			return isNaN(value.getTime()) ? null : value;
		}

		// LocalDate array: [year, month, day]
		if (Array.isArray(value) && value.length >= 3) {
			const [y, m, d] = value;
			return new Date(y, m - 1, d);
		}

		// Numeric timestamp (we have to multiply by 1000, otherwise we get epoch time - 1970)
		if (typeof value === "number") {
			// seconds vs milliseconds heuristic
			const ms = value < 1e12 ? value * 1000 : value;
			const date = new Date(ms);
			return isNaN(date.getTime()) ? null : date;
		}

		// ISO / string date
		if (typeof value === "string") {
			const date = new Date(value);
			return isNaN(date.getTime()) ? null : date;
		}

		return null;
	},

	getCurrentDate: (): Date => {
		return new Date(Date.now());
	},
}