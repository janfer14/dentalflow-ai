export interface Patient {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  gender: 'FEMALE' | 'MALE' | 'OTHER' | 'UNSPECIFIED';
  birthDate: string | null;
  email: string | null;
  phone: string | null;
  whatsappOptIn: boolean;
  address: string | null;
  insuranceProvider: string | null;
  allergies: string | null;
  medications: string | null;
  medicalHistory: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export interface DoctorSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  isDoctor: boolean;
}

export interface Treatment {
  id: string;
  name: string;
  defaultPrice: string;
  durationMinutes: number;
}

export interface Appointment {
  id: string;
  clinicId: string;
  consultingRoomId: string | null;
  patientId: string;
  doctorId: string;
  treatmentId: string | null;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  notes: string | null;
  cancelReason: string | null;
  patient: Patient;
  doctor: DoctorSummary;
  treatment: Treatment | null;
}

export type MessageStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
export type MessageDirection = 'OUTBOUND' | 'INBOUND';

export interface WhatsAppMessage {
  id: string;
  patientId: string;
  appointmentId: string | null;
  channel: 'WHATSAPP' | 'EMAIL' | 'SMS' | 'PUSH';
  direction: MessageDirection;
  status: MessageStatus;
  templateKey: string | null;
  body: string;
  errorReason: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  organizationId: string;
  key: string;
  language: string;
  body: string;
}

export interface WhatsAppStatus {
  configured: boolean;
  phoneNumberId: string | null;
  mode: 'live' | 'sandbox';
}

// --- Clinical records ---

export interface ClinicalNote {
  id: string;
  clinicalRecordId: string;
  doctorId: string;
  content: string;
  diagnosis: string | null;
  aiGenerated: boolean;
  createdAt: string;
  doctor: { id: string; firstName: string; lastName: string };
}

export interface ToothCondition {
  surface: string;
  condition: string;
  notedAt: string;
}

export interface OdontogramTooth {
  id: string;
  odontogramId: string;
  toothNumber: number;
  conditions: ToothCondition[];
  notes: string | null;
}

export interface Odontogram {
  id: string;
  clinicalRecordId: string;
  updatedAt: string;
  teeth: OdontogramTooth[];
}

export type TreatmentPlanItemStatus = 'PROPOSED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface TreatmentPlanItem {
  id: string;
  treatmentPlanId: string;
  treatmentId: string;
  doctorId: string;
  toothNumber: number | null;
  status: TreatmentPlanItemStatus;
  cost: string;
  price: string;
  scheduledAt: string | null;
  completedAt: string | null;
  treatment: Treatment;
  doctor: { id: string; firstName: string; lastName: string };
}

export interface TreatmentPlan {
  id: string;
  clinicalRecordId: string;
  title: string;
  createdAt: string;
  items: TreatmentPlanItem[];
}

export interface PrescriptionItem {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  durationDays: number | null;
  instructions: string | null;
}

export interface Prescription {
  id: string;
  clinicalRecordId: string;
  doctorId: string;
  notes: string | null;
  createdAt: string;
  items: PrescriptionItem[];
  doctor: { id: string; firstName: string; lastName: string };
}

export interface ClinicalRecordSummary {
  record: { id: string; patientId: string; createdAt: string; updatedAt: string };
  clinicalNotes: ClinicalNote[];
  odontogram: Odontogram;
  treatmentPlans: TreatmentPlan[];
  prescriptions: Prescription[];
}

// --- Billing ---

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'INSURANCE' | 'CREDIT_NOTE' | 'OTHER';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  cashRegisterId: string | null;
  method: PaymentMethod;
  amount: string;
  reference: string | null;
  receivedAt: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  appointmentId: string | null;
  status: InvoiceStatus;
  subtotal: string;
  tax: string;
  total: string;
  balanceDue: string;
  issuedAt: string | null;
  dueAt: string | null;
  createdAt: string;
  patient: Patient;
  items: InvoiceItem[];
  payments: Payment[];
}

export interface CashRegisterSession {
  id: string;
  cashRegisterId: string;
  userId: string;
  openedAt: string;
  closedAt: string | null;
  openingAmount: string;
  closingAmount: string | null;
  expectedAmount: string | null;
  difference: string | null;
  user?: { id: string; firstName: string; lastName: string };
}

export interface CashRegister {
  id: string;
  clinicId: string;
  name: string;
  sessions: CashRegisterSession[];
}

// --- Inventory ---

export interface Product {
  id: string;
  organizationId: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  unit: string;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  quantity: number;
  lowStock: boolean;
}

export type StockMovementType =
  | 'PURCHASE_IN'
  | 'CONSUMPTION_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'EXPIRED_OUT';

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  createdAt: string;
}

// --- AI Assistant ---

export type AiParticipant = 'RECEPTION' | 'DOCTOR' | 'PATIENT';

export interface AiMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolCalls: unknown;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  userId: string | null;
  patientId: string | null;
  participant: AiParticipant;
  createdAt: string;
  messages: AiMessage[];
}

export interface AiStatus {
  configured: boolean;
  model: string;
}
