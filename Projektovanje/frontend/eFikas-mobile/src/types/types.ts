import * as LucideIcons from "lucide-react-native";

export type LucideIconName = keyof typeof LucideIcons;

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

export interface OperationalExpenseResponse {
  operationalExpenseId: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  amount: string;
  expenseDate: string;
  createdBy: number;
  authorName: string;
  authorSurname: string;
  createdAt: string;
  voided: boolean;
  voidedBy: number | null;
  voidedAt: string | null;
  voidReason: string | null;
}

export interface ExpenseCategoryResponse {
  expenseCategoryId: number;
  name: string;
  description: string | null;
  active: boolean;
  createdBy: number;
  createdAt: string;
  updatedBy: number;
  updatedAt: string;
}

export interface CreateOperationalExpenseRequest {
  categoryId: number;
  name: string;
  description: string | null;
  amount: string;
  expenseDate: string;
}

export interface DamageResponse {
  damageId: number;
  apartmentId: number;
  title: string;
  description: string;
  estimatedAmount: string | null;
  confirmedAmount: string | null;
  createdBy: number;
  authorName: string;
  authorSurname: string;
  createdAt: string;
  updatedBy: number;
  updatedAt: string;
}

export interface DamageAttachmentResponse {
  damageAttachmentId: number;
  originalName: string;
  contentType: string | null;
  sizeBytes: number;
  uploadedBy: number;
  uploadedAt: string;
  downloadUrl: string;
}

export interface CreateDamageRequest {
  title: string;
  description: string;
  estimatedAmount: string | null;
  confirmedAmount: string | null;
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

export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type WorkerAvailabilityStatus =
  | "OFF_DUTY"
  | "UNAVAILABLE"
  | "ON_BREAK"
  | "AVAILABLE"
  | "BUSY"
  | "ON_LEAVE";

export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface Specialization {
  id: number;
  code: string;
  name: string;
}

export interface CheckOutResponse {
  reservationId: number;
  reservationStatus: "CHECKED_OUT";
  apartmentId: number;
  apartmentStatus: "DIRTY";
  checkedOutByUserId: number;
  checkedOutAt: string;
  cleaningTaskId: number;
}

export interface TaskHistory {
  id: number;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  actorId: number;
  reason: string;
  changedAt: string;
}

export type TaskStatusHistory = TaskHistory;

export interface OperationalTask {
  taskId: number;
  specializationId: number;
  specializationCode: string;
  apartmentId: number | null;
  reservationId: number | null;
  assignedWorkerId: number | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: number;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: number;
  uploadedAt: string;
  downloadUrl: string;
}

export interface BreakPeriod {
  breakPeriodId: number;
  startedAt: string;
  endedAt: string | null;
}

export interface AttendanceSession {
  attendanceSessionId: number;
  workerId: number;
  clockedInAt: string;
  clockedOutAt: string | null;
  breaks: BreakPeriod[];
}

export interface WorkerAvailability {
  workerId: number;
  name: string;
  surname: string;
  status: WorkerAvailabilityStatus;
  attendanceSessionId: number | null;
  clockedInAt: string | null;
  breakStartedAt: string | null;
  availabilityOverrideId: number | null;
  unavailableUntil: string | null;
  unavailabilityReason: string | null;
  leaveRequestId: number | null;
  leaveUntil: string | null;
  leaveReason: string | null;
}

export interface AvailabilityOverride {
  availabilityOverrideId: number;
  workerId: number;
  startsAt: string;
  endsAt: string | null;
  reason: string;
  createdByUserId: number;
  createdAt: string;
  clearedAt: string | null;
  clearedByUserId: number | null;
}

export interface LeaveRequest {
  leaveRequestId: number;
  workerId: number;
  workerName: string;
  workerSurname: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  status: LeaveRequestStatus;
  createdAt: string;
  decidedBy: number | null;
  decidedAt: string | null;
  decisionReason: string | null;
  cancelledBy: number | null;
  cancelledAt: string | null;
}

export interface NotificationItem {
  notificationId: number;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  taskId: number | null;
}

export interface UserProfile {
  userId: number;
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


export type GuestGender = "Male" | "Female";

export interface GuestRequest {
  citizenId: string;
  local: boolean;
  personalDocumentUrl: string | null;
  name: string;
  surname: string;
  gender: GuestGender;
  phoneNumber: string | null;
  birthDate: string;
  birthPlace: string;
  birthMunicipality: string | null;
  birthCountry: string;
  address: string;
  citizenship: string | null;
  passportNumber: string | null;
  passportIssuedDate: string | null;
  visaType: string | null;
  visaNumber: string | null;
  permittedResidenceDate: string | null;
  entryDate: string | null;
  entryPlace: string | null;
}

export interface Guest extends GuestRequest {
  guestId: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationGuest {
  reservationGuestId: number;
  primaryGuest: boolean;
  addedByUserId: number;
  addedAt: string;
  guest: Guest;
}

export type AddReservationGuestRequest =
  | {
      existingGuestId: number;
      guest: null;
      primaryGuest: boolean;
    }
  | {
      existingGuestId: null;
      guest: GuestRequest;
      primaryGuest: boolean;
    };

export interface UpdateReservationGuestRequest {
  guest: GuestRequest;
  primaryGuest: boolean;
}

export type CheckInClaimAction = "CLAIMED" | "RELEASED" | "TAKEN_OVER";

export interface CheckInClaimResponse {
  reservationId: number;
  claimedByUserId: number | null;
  claimedByName: string | null;
  claimedAt: string | null;
}

export interface CheckInClaimHistoryResponse {
  historyId: number;
  action: CheckInClaimAction;
  previousClaimedByUserId: number | null;
  claimedByUserId: number | null;
  performedByUserId: number;
  performedAt: string;
}

export interface CheckInResponse {
  reservation: ReservationDetails;
  guestBookEntriesCreated: number;
  checkedInByUserId: number;
  checkedInAt: string;
}

export type PaymentType = "PAYMENT" | "CORRECTION" | "REVERSAL";

export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export interface Payment {
  paymentId: number;
  reservationId: number;
  type: PaymentType;
  amount: string;
  referencedPaymentId: number | null;
  reference: string | null;
  reason: string | null;
  recordedByUserId: number;
  recordedAt: string;
}

export interface PaymentSummary {
  reservationId: number;
  totalDue: string;
  netPaid: string;
  outstandingBalance: string;
  status: PaymentStatus;
}

export interface DemoReceipt {
  demoReceiptId: number;
  reservationId: number;
  receiptNumber: string;
  issuedAt: string;
  issuedByUserId: number;
  hotelName: string;
  hotelAddress: string;
  hotelTaxId: string;
  apartmentName: string;
  primaryGuestName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  nightlyRate: string;
  totalAmount: string;
  vatAmount: string;
  currency: string;
  pdfSha256: string;
  pdfDownloadPath: string;
}

export interface RecordPaymentRequest {
  amount: string;
  reference?: string | null;
  note?: string | null;
}

export interface CorrectPaymentRequest {
  amount: string;
  reason: string;
}

export interface ReversePaymentRequest {
  reason: string;
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
}

export interface ToggleNotificationRequest {
    pushToken: string;
	enabled: boolean;
}

export interface UnregisterPushNotificationTokenRequest {
    token: string;
}

// ================ Settings =====================
export interface AppErrorDTO {
	note: string;
}
