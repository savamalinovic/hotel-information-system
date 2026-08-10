const scheme = process.env.EXPO_PUBLIC_API_SCHEME ?? "http";
const address = process.env.EXPO_PUBLIC_API_ADDRESS ?? "localhost";
const port = process.env.EXPO_PUBLIC_API_PORT;
const authority = port ? `${address}:${port}` : address;
const version = "v1";

export const API_BASE_URL = `${scheme}://${authority}/api/${version}`;

export const API_URLS = {
    auth: {
        googleLogin: `${API_BASE_URL}/auth/google/login`,
        login: `${API_BASE_URL}/auth/login`,
        register: `${API_BASE_URL}/auth/register`,
		requestOtp: `${API_BASE_URL}/auth/otp/request`,
		verifyOtp: `${API_BASE_URL}/auth/otp/verify`,
		resetPassword: `${API_BASE_URL}/auth/reset-password`,
    },
    
    profile: {
        get: `${API_BASE_URL}/users/me`,
        update: `${API_BASE_URL}/users/me`,
		registerStore: `${API_BASE_URL}/users/register/store`,
		resetPassword: `${API_BASE_URL}/auth/reset-password`,
		getStore: `${API_BASE_URL}/users/me/store`,
    },

	cashRegisters: {
		list: `${API_BASE_URL}/cash-registers`,
		create: `${API_BASE_URL}/cash-registers`,
		delete: (id: number) => `${API_BASE_URL}/cash-registers/${id}`,
	},

	books: {
		addIncome: `${API_BASE_URL}/books/income`,
		getIncomeBookPdf: `${API_BASE_URL}/books/pdf/INCOME`,
		getDomesticGuestsBookPdf: `${API_BASE_URL}/books/pdf/DOMESTIC_GUESTS`,
		getForeignGuestsBookPdf: `${API_BASE_URL}/books/pdf/FOREIGN_GUESTS`,
	},

	reservations: {
		listUser: () => `${API_BASE_URL}/reservations`,

		listByApartment: (apartmentId: number) =>
		`${API_BASE_URL}/apartments/${apartmentId}/reservations`,

		getById: (reservationId: number, apartmentId: number) =>
		`${API_BASE_URL}/reservations/${reservationId}?apartmentId=${apartmentId}`,

		create: (apartmentId: number) =>
		`${API_BASE_URL}/apartments/${apartmentId}/reservations`,

		update: (reservationId: number) =>
		`${API_BASE_URL}/reservations/${reservationId}`,

		delete: (reservationId: number) =>
		`${API_BASE_URL}/reservations/${reservationId}`,
	},

	notifications: {
		pushToken: `${API_BASE_URL}/notifications/push-token`,
		toggle: `${API_BASE_URL}/notifications/toggle`,
	},

    apartments: {
        list: `${API_BASE_URL}/apartments`,
        create: `${API_BASE_URL}/apartments`,
        delete: (id: number) => `${API_BASE_URL}/apartments/${id}`,
        update: (id: number) => `${API_BASE_URL}/apartments/${id}`,
        getById: (id: number) => `${API_BASE_URL}/apartments/${id}`,
    },

    damages: {
        base: (apartmentId: number) => `${API_BASE_URL}/apartments/${apartmentId}/damages`,
        byName: (apartmentId: number, name: string) => 
            `${API_BASE_URL}/apartments/${apartmentId}/damages/${encodeURIComponent(name)}`,
    },

    tasks: {
        base: (apartmentId: number) => 
            `${API_BASE_URL}/apartments/${apartmentId}/tasks`,
        byName: (apartmentId: number, name: string) => 
            `${API_BASE_URL}/apartments/${apartmentId}/tasks/${encodeURIComponent(name)}`,
    },

    expenses: {
        base: (apartmentId: number) => 
            `${API_BASE_URL}/apartments/${apartmentId}/expenses`,
        byName: (apartmentId: number, name: string) => 
            `${API_BASE_URL}/apartments/${apartmentId}/expenses/${encodeURIComponent(name)}`,
    },

	settings: {
		registerError: `${API_BASE_URL}/settings/register-error`
	},

	// Hardcoded fiscal register config for testing purposes
	cash_register: {
		ip_address: "192.168.100.150",
		port: "3566",
		api_token: "f9d1027ef717154120a89b4610e5b2bb",
	},
}
