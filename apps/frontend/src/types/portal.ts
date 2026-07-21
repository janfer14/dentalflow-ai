export interface AuthenticatedPatient {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
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

export interface PortalAppointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  notes: string | null;
  cancelReason: string | null;
  doctor: { firstName: string; lastName: string };
  treatment: { name: string } | null;
  clinic: { name: string; address: string | null };
}

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';

export interface PortalInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export interface PortalPayment {
  id: string;
  method: string;
  amount: string;
  receivedAt: string;
}

export interface PortalInvoice {
  id: string;
  status: InvoiceStatus;
  subtotal: string;
  tax: string;
  total: string;
  balanceDue: string;
  issuedAt: string | null;
  createdAt: string;
  items: PortalInvoiceItem[];
  payments: PortalPayment[];
}
