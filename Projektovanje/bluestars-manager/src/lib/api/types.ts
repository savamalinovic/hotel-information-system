// API DTO types, hand-maintained from the BlueStars OpenAPI 3.1 spec.
// Money is always a decimal string: the backend performs all arithmetic and the
// client only displays and forwards amounts (no floating-point math).

export type Money = string

export type Role = 'MANAGER' | 'AGENT' | 'OPERATIONAL_WORKER'
export type ReservationStatus = 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW'
export type ApartmentOperationalStatus = 'READY' | 'DIRTY' | 'CLEANING' | 'MAINTENANCE'
export type ApartmentEffectiveStatus = ApartmentOperationalStatus | 'OUT_OF_ORDER'
export type TaskStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED'
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type WorkerStatus = 'OFF_DUTY' | 'UNAVAILABLE' | 'ON_BREAK' | 'AVAILABLE' | 'BUSY' | 'ON_LEAVE'
export type Gender = 'Male' | 'Female'
export type BookType = 'DOMESTIC' | 'FOREIGN'
export type PaymentType = 'PAYMENT' | 'CORRECTION' | 'REVERSAL'
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
export type ClaimAction = 'CLAIMED' | 'RELEASED' | 'TAKEN_OVER'

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'MALFORMED_REQUEST'
  | 'BUSINESS_RULE_VIOLATION'
  | 'AUTHENTICATION_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'ACCESS_DENIED'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_CONFLICT'
  | 'DATA_INTEGRITY_CONFLICT'
  | 'UPSTREAM_SERVICE_ERROR'
  | 'INTERNAL_ERROR'

export interface ApiFieldViolation {
  field: string
  message: string
}

export interface ApiErrorBody {
  timestamp?: string
  status?: number
  code?: ErrorCode
  message?: string
  path?: string
  violations?: ApiFieldViolation[]
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

// --- Auth ---

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  email: string
  role: Role
  token: string
}

// --- Users ---

export interface UserDTO {
  name: string
  surname: string
  jmbg: string
  email: string
  address: string
}

export interface AppUserResponse extends UserDTO {
  userId: number
  role: Role
}

export interface SpecializationResponse {
  id: number
  code: string
  name: string
}

export interface ManagedUserResponse {
  id: number
  email: string
  name: string
  surname: string
  jmbg: string
  address: string
  phoneNumber: string
  role: Role
  active: boolean
  specializations: SpecializationResponse[]
  createdAt: string
  updatedAt: string
}

export interface CreateManagedUserRequest {
  email: string
  password: string
  name: string
  surname: string
  jmbg: string
  address: string
  phoneNumber?: string
  role: Role
  specializationIds?: number[]
}

export interface UpdateManagedUserRequest {
  email: string
  name: string
  surname: string
  jmbg: string
  address: string
  phoneNumber?: string
  role: Role
}

export interface UpdateUserStatusRequest {
  active: boolean
}

export interface AssignSpecializationsRequest {
  specializationIds: number[]
}

// --- Workforce / HRM ---

export interface WorkerAvailabilityResponse {
  workerId: number
  name: string
  surname: string
  role: Role
  status: WorkerStatus
  attendanceSessionId: number | null
  clockedInAt: string | null
  breakStartedAt: string | null
  availabilityOverrideId: number | null
  unavailableUntil: string | null
  unavailabilityReason: string | null
  leaveRequestId: number | null
  leaveEndDate: string | null
  leaveReason: string | null
}

export interface LeaveRequestResponse {
  leaveRequestId: number
  workerId: number
  workerName: string
  workerSurname: string
  workerRole: Role
  startDate: string
  endDate: string
  reason: string
  status: LeaveStatus
  createdAt: string
  decidedBy: number | null
  decidedAt: string | null
  decisionReason: string | null
  cancelledBy: number | null
  cancelledAt: string | null
}

export interface RejectLeaveRequest {
  reason: string
}

// --- Analytics ---

export interface Period {
  from: string
  to: string
}

export interface NamedAmount {
  name: string
  amount: Money
}

export interface NamedCount {
  name: string
  count: number
}

export interface DailyFinancialPoint {
  date: string
  revenue: Money
  operationalExpenses: Money
}

export interface WorkerCompletion {
  workerId: number
  workerName: string
  completedTasks: number
}

export interface ApartmentTypeOccupancy {
  apartmentType: string
  reservationCount: number
  nights: number
  capacityApartmentNights: number
  occupiedApartmentNights: number
  occupancyPercentage: number
}

export interface Financial {
  revenue: Money
  operationalExpenses: Money
  netResult: Money
  averageReservationValue: Money
  paidAmount: Money
  unpaidAmount: Money
  damageCount: number
  confirmedDamageAmount: Money
  dailyTrend: DailyFinancialPoint[]
  revenueByApartmentType: NamedAmount[]
  expensesByCategory: NamedAmount[]
}

export interface ReservationsStats {
  reservationCount: number
  nights: number
  capacityApartmentNights: number
  occupiedApartmentNights: number
  occupancyPercentage: number
  byStatus: NamedCount[]
  byApartmentType: ApartmentTypeOccupancy[]
}

export interface TasksStats {
  byStatus: NamedCount[]
  bySpecialization: NamedCount[]
  newCount: number
  blockedCount: number
  completedByWorker: WorkerCompletion[]
  averageCheckoutToReadyMinutes: number
}

export interface WorkforceStats {
  presentWorkers: number
  availableWorkers: number
  busyWorkers: number
}

export interface AnalyticsResponse {
  period: Period
  financial: Financial
  reservations: ReservationsStats
  tasks: TasksStats
  workforce: WorkforceStats
}

// --- Reservations ---

export interface ReservationDetailsResponse {
  reservationId: number
  apartmentId: number
  apartmentName: string
  checkInDate: string
  checkOutDate: string
  nights: number
  guestCount: number
  nightlyRate: Money
  totalPrice: Money
  note: string
  status: ReservationStatus
  createdByUserId: number
  checkInClaimedByUserId: number | null
  checkInClaimedAt: string | null
  checkedInByUserId: number | null
  checkedInAt: string | null
  checkedOutByUserId: number | null
  checkedOutAt: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export interface CreateReservationRequest {
  apartmentId: number
  checkInDate: string
  checkOutDate: string
  guestCount: number
  nightlyRate?: Money
  note?: string
}

export interface UpdateReservationStayRequest {
  checkOutDate: string
}

export interface ChangeReservationStatusRequest {
  status: ReservationStatus
  reason: string
}

export interface ReservationStatusHistoryResponse {
  reservationStatusHistoryId: number
  status: ReservationStatus
  reason: string
  changedByUserId: number
  changedAt: string
}

export interface CheckInClaimHistoryResponse {
  historyId: number
  action: ClaimAction
  previousClaimedByUserId: number | null
  claimedByUserId: number | null
  performedByUserId: number
  performedAt: string
}

export interface GuestResponse {
  guestId: number
  citizenId: string
  local: boolean
  personalDocumentUrl: string
  name: string
  surname: string
  gender: Gender
  phoneNumber: string
  birthDate: string
  birthPlace: string
  birthMunicipality: string
  birthCountry: string
  address: string
  citizenship: string
  passportNumber: string
  passportIssuedDate: string
  visaType: string
  visaNumber: string
  permittedResidenceDate: string
  entryDate: string
  entryPlace: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface ReservationGuestResponse {
  reservationGuestId: number
  primaryGuest: boolean
  addedByUserId: number
  addedAt: string
  guest: GuestResponse
}

export interface PaymentResponse {
  paymentId: number
  reservationId: number
  type: PaymentType
  amount: Money
  referencedPaymentId: number | null
  reference: string
  reason: string
  recordedByUserId: number
  recordedAt: string
}

export interface PaymentSummaryResponse {
  reservationId: number
  totalDue: Money
  netPaid: Money
  outstandingBalance: Money
  status: PaymentStatus
}

export interface AvailableApartmentResponse {
  apartmentId: number
  name: string
  address: string
  floor: number
  apartmentTypeId: number
  apartmentTypeName: string
  capacity: number
  defaultNightlyRate: Money
}

// --- Apartments ---

export interface ApartmentTypeResponse {
  apartmentTypeId: number
  name: string
  description: string
  capacity: number
  defaultNightlyRate: Money
  active: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export interface ApartmentTypeRequest {
  name: string
  description?: string
  capacity: number
  defaultNightlyRate: Money
}

export interface ApartmentTraitResponse {
  keyName: string
}

export interface ApartmentPictureResponse {
  pictureId: number
  url: string
  displayOrder: number
  createdAt: string
}

export interface ApartmentDetailsResponse {
  apartmentId: number
  name: string
  address: string
  floor: number
  type: ApartmentTypeResponse
  operationalStatus: ApartmentOperationalStatus
  effectiveStatus: ApartmentEffectiveStatus
  active: boolean
  version: number
  createdAt: string
  updatedAt: string
  pictures: ApartmentPictureResponse[]
}

export interface ApartmentRequest {
  name: string
  address: string
  floor?: number
  apartmentTypeId: number
}

export interface ApartmentStatusRequest {
  status: ApartmentOperationalStatus
  reason: string
}

export interface ApartmentStatusHistoryResponse {
  apartmentStatusHistoryId: number
  status: ApartmentOperationalStatus
  reason: string
  changedByUserId: number
  changedAt: string
}

export interface ApartmentUnavailabilityRequest {
  startDate: string
  endDate: string
  reason: string
}

export interface ApartmentUnavailabilityResponse {
  apartmentUnavailabilityId: number
  startDate: string
  endDate: string
  reason: string
  createdByUserId: number
  createdAt: string
}

export interface ApartmentPictureOrderRequest {
  pictureIds: number[]
}

// --- Tasks ---

export interface TaskResponse {
  taskId: number
  specializationId: number
  specializationCode: string
  apartmentId: number | null
  reservationId: number | null
  assignedWorkerId: number | null
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export interface CreateTaskRequest {
  specializationId: number
  apartmentId?: number
  reservationId?: number
  title: string
  description: string
  priority: TaskPriority
}

export interface TaskReasonRequest {
  reason: string
}

export interface TaskHistoryResponse {
  id: number
  fromStatus: TaskStatus | null
  toStatus: TaskStatus
  actorId: number
  reason: string
  changedAt: string
}

export interface TaskAttachmentResponse {
  id: number
  originalName: string
  contentType: string
  sizeBytes: number
  uploadedBy: number
  uploadedAt: string
  downloadUrl: string
}

// --- Expenses ---

export interface OperationalExpenseResponse {
  operationalExpenseId: number
  categoryId: number
  categoryName: string
  name: string
  description: string
  amount: Money
  expenseDate: string
  createdBy: number
  authorName: string
  authorSurname: string
  createdAt: string
  voided: boolean
  voidedBy: number | null
  voidedAt: string | null
  voidReason: string | null
}

export interface CreateOperationalExpenseRequest {
  categoryId: number
  name: string
  description?: string
  amount: Money
  expenseDate: string
}

export interface VoidOperationalExpenseRequest {
  reason: string
}

export interface ExpenseCategoryResponse {
  expenseCategoryId: number
  name: string
  description: string
  active: boolean
  createdBy: number
  createdAt: string
  updatedBy: number | null
  updatedAt: string | null
}

export interface CreateExpenseCategoryRequest {
  name: string
  description?: string
}

export interface UpdateExpenseCategoryRequest {
  name: string
  description?: string
  active: boolean
}

// --- Damages ---

export interface DamageResponse {
  damageId: number
  apartmentId: number
  title: string
  description: string
  estimatedAmount: Money
  confirmedAmount: Money
  createdBy: number
  authorName: string
  authorSurname: string
  createdAt: string
  updatedBy: number | null
  updatedAt: string | null
}

export interface CreateDamageRequest {
  title: string
  description: string
  estimatedAmount?: Money
  confirmedAmount?: Money
}

export interface UpdateDamageRequest {
  title: string
  description: string
  estimatedAmount?: Money
  confirmedAmount?: Money
}

export interface DamageAttachmentResponse {
  damageAttachmentId: number
  originalName: string
  contentType: string
  sizeBytes: number
  uploadedBy: number
  uploadedAt: string
  downloadUrl: string
}

// --- Books ---

export interface GuestBookEntryResponse {
  guestBookEntryId: number
  reservationId: number
  guestId: number
  bookType: BookType
  citizenId: string
  personalDocumentUrl: string
  name: string
  surname: string
  gender: Gender
  phoneNumber: string
  birthDate: string
  birthPlace: string
  birthMunicipality: string
  birthCountry: string
  address: string
  citizenship: string
  passportNumber: string
  passportIssuedDate: string
  visaType: string
  visaNumber: string
  permittedResidenceDate: string
  entryDate: string
  entryPlace: string
  apartmentId: number
  apartmentName: string
  apartmentFloor: number
  arrivedAt: string
  plannedDepartureDate: string
  checkedInByUserId: number
  createdAt: string
}

export interface IncomeBookEntryResponse {
  incomeBookEntryId: number
  reservationId: number
  receiptNumber: string
  accountingDate: string
  description: string
  serviceSaleRevenue: Money
  totalRevenue: Money
  vatAmount: Money
  createdAt: string
}

// --- Audit ---

export interface AuditLogResponse {
  auditLogId: number
  event: string
  occurredAt: string
  actorId: number | null
  reservationId: number | null
  apartmentId: number | null
  taskId: number | null
  details: string
}

// --- Notifications ---

export interface NotificationResponse {
  notificationId: number
  type: string
  title: string
  body: string
  createdAt: string
  readAt: string | null
  taskId: number | null
}

// --- Hotel profile ---

export interface HotelProfileResponse {
  name: string
  legalName: string
  address: string
  city: string
  countryCode: string
  phoneNumber: string
  email: string
  taxId: string
  updatedAt: string | null
}

export interface UpdateHotelProfileRequest {
  name: string
  legalName?: string
  address?: string
  city?: string
  countryCode?: string
  phoneNumber?: string
  email?: string
  taxId?: string
}
