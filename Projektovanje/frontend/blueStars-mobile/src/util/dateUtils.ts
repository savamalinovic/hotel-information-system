import dayjs from "dayjs";
import { dateService } from "../services/dateService";

export const calculateNights = (
  arrivalInput: any, 
  departureInput: any
): number => {
  const cleanArrival = dateService.parseBackendDate(arrivalInput);
  const cleanDeparture = dateService.parseBackendDate(departureInput);

  if (!cleanArrival || !cleanDeparture) {
    console.warn("calculateNights: Neispravni datumi", { arrivalInput, departureInput });
    return 1;
  }

  const arrival = dayjs(cleanArrival).startOf("day");
  const departure = dayjs(cleanDeparture).startOf("day");

  const diff = departure.diff(arrival, "day");

  return Math.max(1, diff);
};
