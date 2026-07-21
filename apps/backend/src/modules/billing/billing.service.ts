import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { CloseSessionDto, OpenSessionDto } from './dto/cash-session.dto';

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvoice(dto: CreateInvoiceDto) {
    const subtotal = round2(
      dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    );
    const tax = round2(subtotal * (dto.taxRate ?? 0));
    const total = round2(subtotal + tax);

    return this.prisma.invoice.create({
      data: {
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        status: 'ISSUED',
        subtotal,
        tax,
        total,
        balanceDue: total,
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: {
          create: dto.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: round2(item.quantity * item.unitPrice),
            treatmentPlanItemId: item.treatmentPlanItemId,
          })),
        },
      },
      include: { items: true, patient: true },
    });
  }

  async listInvoices(query: ListInvoicesDto) {
    return this.prisma.invoice.findMany({
      where: { patientId: query.patientId, status: query.status },
      orderBy: { createdAt: 'desc' },
      include: { patient: true, items: true, payments: true },
    });
  }

  async getInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: true,
        items: true,
        payments: true,
        creditNotes: true,
      },
    });
    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }
    return invoice;
  }

  async registerPayment(invoiceId: string, dto: RegisterPaymentDto) {
    const invoice = await this.getInvoice(invoiceId);

    if (invoice.status === 'PAID' || invoice.status === 'VOID') {
      throw new BadRequestException('La factura ya está pagada o anulada');
    }

    if (dto.cashRegisterId) {
      const openSession = await this.prisma.cashRegisterSession.findFirst({
        where: { cashRegisterId: dto.cashRegisterId, closedAt: null },
      });
      if (!openSession) {
        throw new BadRequestException(
          'No hay una sesión de caja abierta para registrar el cobro',
        );
      }
    }

    const amount = round2(dto.amount);
    const newBalance = round2(Number(invoice.balanceDue) - amount);

    if (newBalance < -0.01) {
      throw new BadRequestException(
        'El monto excede el saldo pendiente de la factura',
      );
    }

    await this.prisma.payment.create({
      data: {
        invoiceId,
        cashRegisterId: dto.cashRegisterId,
        method: dto.method,
        amount,
        reference: dto.reference,
      },
    });

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        balanceDue: Math.max(newBalance, 0),
        status: newBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID',
      },
      include: { items: true, payments: true, patient: true },
    });
  }

  async listAccountsReceivable(patientId?: string) {
    return this.prisma.invoice.findMany({
      where: {
        patientId,
        status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
        balanceDue: { gt: 0 },
      },
      orderBy: { dueAt: 'asc' },
      include: { patient: true },
    });
  }

  // --- Cash registers ---

  async listCashRegisters(clinicId?: string) {
    return this.prisma.cashRegister.findMany({
      where: { clinicId },
      include: { sessions: { where: { closedAt: null } } },
    });
  }

  async openSession(userId: string, dto: OpenSessionDto) {
    const existing = await this.prisma.cashRegisterSession.findFirst({
      where: { cashRegisterId: dto.cashRegisterId, closedAt: null },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe una sesión de caja abierta para este punto de cobro',
      );
    }

    return this.prisma.cashRegisterSession.create({
      data: {
        cashRegisterId: dto.cashRegisterId,
        userId,
        openingAmount: dto.openingAmount,
      },
    });
  }

  async closeSession(sessionId: string, dto: CloseSessionDto) {
    const session = await this.prisma.cashRegisterSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada');
    }
    if (session.closedAt) {
      throw new BadRequestException('Esta sesión ya fue cerrada');
    }

    const cashPayments = await this.prisma.payment.aggregate({
      where: {
        cashRegisterId: session.cashRegisterId,
        method: 'CASH',
        receivedAt: { gte: session.openedAt },
      },
      _sum: { amount: true },
    });

    const expectedAmount = round2(
      Number(session.openingAmount) + Number(cashPayments._sum.amount ?? 0),
    );
    const difference = round2(dto.closingAmount - expectedAmount);

    return this.prisma.cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        closedAt: new Date(),
        closingAmount: dto.closingAmount,
        expectedAmount,
        difference,
      },
    });
  }

  async listSessions(cashRegisterId: string) {
    return this.prisma.cashRegisterSession.findMany({
      where: { cashRegisterId },
      orderBy: { openedAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
