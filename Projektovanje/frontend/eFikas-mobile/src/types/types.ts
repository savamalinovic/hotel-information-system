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
