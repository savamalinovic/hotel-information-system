import axiosInstance from "@/src/api/axiosInstance";
import { profileService } from "@/src/api/services/profileService";
import { API_URLS } from "@/src/util/apiConstants";
import {
  AgentDashboardData,
  NotificationItem,
  OperationalTask,
  PageResponse,
  ReservationDetails,
  TodayAgendaItem,
  TodayReservationKind,
} from "@/src/types/types";

const PAGE_SIZE = 100;

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrowDateKey = (today: string) => {
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return getLocalDateKey(date);
};

const getReservationsForToday = async (today: string) => {
  const to = getTomorrowDateKey(today);
  const loadPage = async (page: number) => {
    const response = await axiosInstance.get<PageResponse<ReservationDetails>>(
      API_URLS.reservations.list,
      { params: { from: today, to, page, size: PAGE_SIZE } }
    );
    return response.data;
  };

  const firstPage = await loadPage(0);
  const reservations = [...firstPage.content];

  for (let page = 1; page < firstPage.totalPages; page += 1) {
    const nextPage = await loadPage(page);
    reservations.push(...nextPage.content);
  }

  return reservations;
};

const getTotalElements = async <T>(url: string, params: Record<string, string>) => {
  const response = await axiosInstance.get<PageResponse<T>>(url, {
    params: { ...params, size: 1 },
  });
  return response.data.totalElements;
};

const getAgenda = (reservations: ReservationDetails[], today: string): TodayAgendaItem[] =>
  reservations
    .flatMap((reservation) => {
      const isArrival = reservation.checkInDate === today;
      const isDeparture = reservation.checkOutDate === today;

      if (!isArrival && !isDeparture) {
        return [];
      }

      const kind: TodayReservationKind = isArrival && isDeparture
        ? "arrivalAndDeparture"
        : isArrival
          ? "arrival"
          : "departure";

      return [{ reservation, kind }];
    })
    .sort((left, right) => left.reservation.apartmentName.localeCompare(right.reservation.apartmentName));

export const agentDashboardService = {
  getDashboard: async (today = getLocalDateKey()): Promise<AgentDashboardData> => {
    const [profile, reservations, secondaryResults] = await Promise.all([
      profileService.fetchProfile(),
      getReservationsForToday(today),
      Promise.allSettled([
        getTotalElements<OperationalTask>(API_URLS.tasks.list, { status: "NEW" }),
        getTotalElements<OperationalTask>(API_URLS.tasks.list, { status: "BLOCKED" }),
        getTotalElements<NotificationItem>(API_URLS.notifications.list, { unreadOnly: "true" }),
      ]),
    ]);

    const getMetric = (index: number) => {
      const result = secondaryResults[index];
      return result.status === "fulfilled" ? result.value : null;
    };

    return {
      today,
      profile,
      arrivals: reservations.filter((reservation) => reservation.checkInDate === today).length,
      departures: reservations.filter((reservation) => reservation.checkOutDate === today).length,
      checkedIn: reservations.filter((reservation) => reservation.status === "CHECKED_IN").length,
      newTasks: getMetric(0),
      blockedTasks: getMetric(1),
      unreadNotifications: getMetric(2),
      agenda: getAgenda(reservations, today),
    };
  },
};
