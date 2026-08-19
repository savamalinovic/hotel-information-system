import * as LucideIcons from "lucide-react-native";

export type LucideIconName = keyof typeof LucideIcons;

export type BookkeepingMode = "yearly" | "custom";

export interface LoginRequest {
  email: string;
  password: string;
}

export const USER_ROLES = ["MANAGER", "AGENT", "OPERATIONAL_WORKER"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthenticationResponse {
  email: string;
  role: UserRole;
  token: string;
}

export interface OAuthLoginResponse {
  accessToken: string;
}

export interface ApiErrorViolation {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  violations: ApiErrorViolation[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type ReservationStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

export interface ReservationDetails {
  reservationId: number;
  apartmentId: number;
  apartmentName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestCount: number;
  nightlyRate: string;
  totalPrice: string;
  note: string | null;
  status: ReservationStatus;
  createdByUserId: number;
  checkInClaimedByUserId: number | null;
  checkInClaimedAt: string | null;
  checkedInByUserId: number | null;
  checkedInAt: string | null;
  checkedOutByUserId: number | null;
  checkedOutAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableApartment {
  apartmentId: number;
  name: string;
  address: string;
  floor: number;
  apartmentTypeId: number;
  apartmentTypeName: string;
  capacity: number;
  defaultNightlyRate: string;
}

export interface ReservationCreateRequest {
  apartmentId: number;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  nightlyRate?: string | null;
  note?: string | null;
}

export interface ReservationStayUpdateRequest {
  checkOutDate: string;
}

export interface ReservationStatusUpdateRequest {
  status: "CANCELLED" | "NO_SHOW";
  reason: string;
}

export interface ReservationStatusHistory {
  reservationStatusHistoryId: number;
  status: ReservationStatus;
  reason: string | null;
  changedByUserId: number | null;
  changedAt: string;
}

export type TaskStatus =
  | "NEW"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED";

export interface OperationalTask {
  taskId: number;
  specializationId: number;
  specializationCode: string;
  apartmentId: number | null;
  reservationId: number | null;
  assignedWorkerId: number | null;
  title: string;
  description: string | null;
  priority: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  notificationId: number;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface UserProfile {
  name: string;
  surname: string;
  jmbg: string;
  email: string;
  address: string;
  role: UserRole;
}

export type TodayReservationKind = "arrival" | "departure" | "arrivalAndDeparture";

export interface TodayAgendaItem {
  reservation: ReservationDetails;
  kind: TodayReservationKind;
}

export interface AgentDashboardData {
  today: string;
  profile: UserProfile;
  arrivals: number;
  departures: number;
  checkedIn: number;
  newTasks: number | null;
  blockedTasks: number | null;
  unreadNotifications: number | null;
  agenda: TodayAgendaItem[];
}

export type ApartmentOperationalStatus =
  | "READY"
  | "DIRTY"
  | "CLEANING"
  | "MAINTENANCE";

export type ApartmentEffectiveStatus =
  | ApartmentOperationalStatus
  | "OUT_OF_ORDER";

export type ApartmentType = {
  apartmentTypeId: number;
  name: string;
  description: string | null;
  capacity: number;
  defaultNightlyRate: string | number;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ApartmentPicture = {
  pictureId: number;
  url: string;
  displayOrder: number;
  createdAt: string;
};

export type ApartmentDetails = {
  apartmentId: number;
  name: string;
  address: string;
  floor: number;
  type: ApartmentType;
  operationalStatus: ApartmentOperationalStatus;
  effectiveStatus: ApartmentEffectiveStatus;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  pictures: ApartmentPicture[];
};

export type ApartmentStatusHistory = {
  apartmentStatusHistoryId: number;
  status: ApartmentOperationalStatus;
  reason: string;
  changedByUserId: number;
  changedAt: string;
};

export type ApartmentUnavailability = {
  apartmentUnavailabilityId: number;
  startDate: string;
  endDate: string;
  reason: string;
  createdByUserId: number;
  createdAt: string;
};

export interface OtpSendRequest {
	email: string;
}

export interface OtpVerifyRequest {
	email: string;
	otp: string;
}

export interface ResetPasswordRequest {
	email: string;
	newPassword: string;
	confirmPassword: string;
  otp: string;
}


export interface StatisticsDataPoint {
  label: string;
  value: number;
}

export interface StatisticsResponse {
  data: StatisticsDataPoint[];
}

export interface Apartment {
  apartmentId: number;
  name: string;
  address: string;
  numberOfBeds: number;
  numberOfRooms: number;
  capacity: number;
  pricePerDay: number;
  pricePerNight: number;
  pictures: string[];
  inventory: ApartmentInventory;
}

export type ApartmentInventory = {
  parking: boolean;
  tv: boolean;
  wifi: boolean;
  fen: boolean;
  klima: boolean;
  vesMasina: boolean;
  kafa: boolean;
  balkon: boolean;
};

export type CreateApartmentPayload = {
  apartment: {
    name: string;
    address: string;
    numberOfBeds: number;
    numberOfRooms: number;
    capacity: number;
    pricePerNight: number;
    pricePerDay: number;
    traits: Record<string, boolean>;
  };
  pictures: {
    uri: string;
    name: string;   
    type: string;   
  }[];
};

export interface ApartmentResponse {
  apartmentId: number;
  name: string;
  address: string;
  numberOfBeds: number;
  numberOfRooms: number;
  capacity: number;
  pricePerDay: number;
  pricePerNight: number;
  pictures: string[];
  traits?: Record<string, boolean>;
}

export type AddingApartmentResponse = {
  success: boolean;
  message?: string;
  apartmentId?: number;
  data?: any;
};

export interface ApartmentCurrentInfo {
  apartmentId: number;
  name: string;
  address: string;
  imageUrl: string;
  status: boolean;
  statusUntil: string | null;
  nextGuestsDate: string | null;
}

export interface GuestBase {
  id?: number;
  citizenId: string;
  isLocal: boolean;
  personalDocumentURL?: string | null;

  name: string;
  surname: string;
  gender: "Male" | "Female";
  phoneNumber: string;
  birthDate: Date;
  birthPlace: string;
  birthCountry: string;
  address: string;
  accommodationUnitNumber: number;
  accommodationUnitFloor: number;

  dateTimeOfArrival: Date;
  dateTimeOfDeparture: Date;

  issuedInvoiceNumber?: string | null;
  remarks?: string | null;
}

export interface DomesticGuest extends GuestBase {
  isLocal: true;
  birthMunicipality: string;
}

export interface ForeignGuest extends GuestBase {
  isLocal: false;
  citizenship: string;
  passportNumber: string;
  passportIssuedDate: Date;
  visaType?: string | null;
  visaNumber?: string | null;
  permittedResidenceDate?: Date;
  entryDate?: Date;
  entryPlace?: string | null;
}

export type Guest = DomesticGuest | ForeignGuest;

export interface CreateDomesticGuestPayload {
  name: string;
  surname: string;
  gender: "Male" | "Female";
  birthDate: Date;
  birthPlace: string;
  birthMunicipality: string;
  birthCountry: string;
  address: string;
  jmbg: string;

  accommodationUnitNumber: number;
  accommodationUnitFloor: number;
  dateTimeOfArrival: string;
  dateTimeOfDeparture: string;

  issuedInvoiceNumber?: string | null;
  remarks?: string | null;
}


export interface CreateForeignGuestPayload {
  name: string;
  surname: string;
  gender: "Male" | "Female";
  birthDate: Date;
  birthPlace: string;
  birthCountry: string;
  address: string;

  citizenship: string;
  passportNumber: string;
  passportIssuedDate: Date;

  visaType?: string | null;
  visaNumber?: string | null;
  permittedResidenceDate?: string | null;
  entryDate?: Date;
  entryPlace?: string | null;

  accommodationUnitNumber: number;
  accommodationUnitFloor: number;
  dateTimeOfArrival: Date;
  dateTimeOfDeparture: Date;

  issuedInvoiceNumber?: string | null;
  remarks?: string | null;
}


export interface CreateIncomeBookRequest {
	apartmentId: number;
    description: string;
    productSaleRevenue: number;
    goodsSaleRevenue: number;
    serviceSaleRevenue: number;
    otherRevenue: number;
    financialRevenue: number;
    vatAmount: number;
}


export interface Reservation {
  reservationId: number;
  apartment: Apartment;
  guest: Guest;
  guestQuantity: number;
  price: number | null;
  note: string | null;
  reservationType: string;
}

export interface CreateReservationPayload {
  guestQuantity: number;
  price?: number | null;
  note?: string | null;
  reservationType: string;
  guest: Omit<Guest, "id">;
}

export interface UpdateReservationPayload {
  apartmentId?: number;
  guest: Guest;
  guestQuantity?: number;
  price?: number | null;
  note?: string | null;
  reservationType?: string;
}

export interface MenuItemProps {
  id: string;
  icon: LucideIconName;
  text: string;
  onPressMenuItem: () => void;
}

export interface MenuSectionProps {
  title: string;
  items: MenuItemProps[];
}

export interface ProfileData {
  name: string;
  surname: string;
  jmbg: string;
  email: string;
}

export interface CashRegister {
  cashRegisterId: number;
  cashRegisterNumber: number;
  softwareVersion: string;
}

// ================ Book DTOs ===================
export type PdfResult = {
  uri: string;
};

export interface DateRangeDTO {
  from: string | null;
  to: string | null;
}

export interface DownloadIncomeBookRequest {
  taxpayerId: number;
  storeId: number;
  period: DateRangeDTO;
}

export interface GuestsBookRequest {
  period: DateRangeDTO;
  active: boolean;
}

export interface BookPath {
    displayName: string;
    path: string;
}

export interface StoreDTO {
	name: string;
	address: string;
	activity: string;
	activityCode: string;
	jib: string;
}

// ================ Notification ===================
export interface PushNotificationTokenRequest {
    token: string;
	platform: 'android' | 'ios';
    email: string;
}

export interface ToggleNotificationRequest {
    pushToken: string;
	enabled: boolean;
}

export interface ApartmentDamageDTO {
    name: string;        
    damagePrice: number; 
    note: string;       
    status: boolean;     
}


export interface ApartmentTaskDTO {
    name: string;
    note: string;
    status: boolean;
    dateTime: string; 
}

export interface ApartmentTaskResponse {
    apartmentId: number;
    name: string;
    note: string;
    status: boolean;
    dateTime: string;
}

export interface ApartmentExpenseDTO {
    name: string;      
    amount: number;    
    note: string;     
    status: boolean;  
    expenseType: string; 
}

export interface ApartmentExpenseResponse extends ApartmentExpenseDTO {
    apartmentId: number;
}


// ================ Settings =====================
export interface AppErrorDTO {
	note: string;
}
