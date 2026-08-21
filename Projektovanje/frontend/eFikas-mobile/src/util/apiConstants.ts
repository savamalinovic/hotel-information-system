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
		requestOtp: `${API_BASE_URL}/auth/otp/request`,
		verifyOtp: `${API_BASE_URL}/auth/otp/verify`,
		resetPassword: `${API_BASE_URL}/auth/reset-password`,
    },
    
    profile: {
        get: `${API_BASE_URL}/users/me`,
        update: `${API_BASE_URL}/users/me`,
		resetPassword: `${API_BASE_URL}/auth/reset-password`,
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
		list: `${API_BASE_URL}/reservations`,
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

  reservationWorkflows: {
    list: `${API_BASE_URL}/reservations`,
    availability: `${API_BASE_URL}/reservations/availability`,
    byId: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}`,
    stay: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}/stay`,
    status: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}/status`,
    statusHistory: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}/status-history`,
  },

  guestCheckIn: {
    guests: `${API_BASE_URL}/guests`,
    guest: (guestId: number) => `${API_BASE_URL}/guests/${guestId}`,
    reservationGuests: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}/guests`,
    reservationGuest: (reservationId: number, guestId: number) =>
      `${API_BASE_URL}/reservations/${reservationId}/guests/${guestId}`,
    claim: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}/check-in/claim`,
    claimHistory: (reservationId: number) =>
      `${API_BASE_URL}/reservations/${reservationId}/check-in/claim-history`,
    checkIn: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}/check-in`,
  },

  paymentWorkflows: {
    ledger: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}/payments`,
    summary: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}/payments/summary`,
    correction: (reservationId: number, paymentId: number) =>
      `${API_BASE_URL}/reservations/${reservationId}/payments/${paymentId}/corrections`,
    reversal: (reservationId: number, paymentId: number) =>
      `${API_BASE_URL}/reservations/${reservationId}/payments/${paymentId}/reversal`,
  },

  checkOutWorkflows: {
    checkOut: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}/check-out`,
    task: (taskId: number) => `${API_BASE_URL}/tasks/${taskId}`,
    taskHistory: (taskId: number) => `${API_BASE_URL}/tasks/${taskId}/history`,
    tasks: `${API_BASE_URL}/tasks`,
  },

  taskWorkflows: {
    specializations: `${API_BASE_URL}/specializations`,
    tasks: `${API_BASE_URL}/tasks`,
    available: `${API_BASE_URL}/tasks/available`,
    mine: `${API_BASE_URL}/tasks/mine`,
    task: (taskId: number) => `${API_BASE_URL}/tasks/${taskId}`,
    history: (taskId: number) => `${API_BASE_URL}/tasks/${taskId}/history`,
    attachments: (taskId: number) => `${API_BASE_URL}/tasks/${taskId}/attachments`,
    claim: (taskId: number) => `${API_BASE_URL}/tasks/${taskId}/claim`,
    start: (taskId: number) => `${API_BASE_URL}/tasks/${taskId}/start`,
    block: (taskId: number) => `${API_BASE_URL}/tasks/${taskId}/block`,
    resume: (taskId: number) => `${API_BASE_URL}/tasks/${taskId}/resume`,
    complete: (taskId: number) => `${API_BASE_URL}/tasks/${taskId}/complete`,
    cancel: (taskId: number) => `${API_BASE_URL}/tasks/${taskId}/cancel`,
  },

  workforce: {
    availability: `${API_BASE_URL}/workforce/me/availability`,
    clockIn: `${API_BASE_URL}/workforce/me/attendance/clock-in`,
    startBreak: `${API_BASE_URL}/workforce/me/attendance/breaks/start`,
    endBreak: `${API_BASE_URL}/workforce/me/attendance/breaks/end`,
    clockOut: `${API_BASE_URL}/workforce/me/attendance/clock-out`,
    attendanceSessions: `${API_BASE_URL}/workforce/me/attendance-sessions`,
    overrides: `${API_BASE_URL}/workforce/me/availability-overrides`,
    clearOverride: (overrideId: number) => `${API_BASE_URL}/workforce/me/availability-overrides/${overrideId}/clear`,
    leaveRequests: `${API_BASE_URL}/workforce/me/leave-requests`,
    cancelLeaveRequest: (requestId: number) => `${API_BASE_URL}/workforce/me/leave-requests/${requestId}/cancel`,
  },

  demoReceipts: {
    metadata: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}/demo-receipt`,
    pdf: (reservationId: number) => `${API_BASE_URL}/reservations/${reservationId}/demo-receipt/pdf`,
  },

	notifications: {
		list: `${API_BASE_URL}/notifications`,
		markRead: (notificationId: number) => `${API_BASE_URL}/notifications/${notificationId}/read`,
		pushToken: `${API_BASE_URL}/notifications/push-token`,
		toggle: `${API_BASE_URL}/notifications/toggle`,
	},

    apartments: {
        list: `${API_BASE_URL}/apartments`,
        create: `${API_BASE_URL}/apartments`,
        delete: (id: number) => `${API_BASE_URL}/apartments/${id}`,
        update: (id: number) => `${API_BASE_URL}/apartments/${id}`,
        getById: (id: number) => `${API_BASE_URL}/apartments/${id}`,
        statusHistory: (id: number) => `${API_BASE_URL}/apartments/${id}/status-history`,
        unavailability: (id: number) => `${API_BASE_URL}/apartments/${id}/unavailability`,
    },

    apartmentTypes: {
        list: `${API_BASE_URL}/apartment-types`,
        getById: (id: number) => `${API_BASE_URL}/apartment-types/${id}`,
    },

    damageWorkflows: {
        list: (apartmentId: number) => `${API_BASE_URL}/apartments/${apartmentId}/damages`,
        detail: (apartmentId: number, damageId: number) =>
            `${API_BASE_URL}/apartments/${apartmentId}/damages/${damageId}`,
        attachments: (apartmentId: number, damageId: number) =>
            `${API_BASE_URL}/apartments/${apartmentId}/damages/${damageId}/attachments`,
    },

	tasks: {
		list: `${API_BASE_URL}/tasks`,
		base: (apartmentId: number) =>
            `${API_BASE_URL}/apartments/${apartmentId}/tasks`,
        byName: (apartmentId: number, name: string) => 
            `${API_BASE_URL}/apartments/${apartmentId}/tasks/${encodeURIComponent(name)}`,
    },

    operationalExpenses: {
        categories: `${API_BASE_URL}/expense-categories`,
        list: `${API_BASE_URL}/expenses`,
        detail: (expenseId: number) => `${API_BASE_URL}/expenses/${expenseId}`,
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
