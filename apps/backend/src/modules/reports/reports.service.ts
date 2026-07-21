import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    organizationId: string,
    fromParam?: string,
    toParam?: string,
  ) {
    const to = toParam ? new Date(toParam) : new Date();
    const from = fromParam
      ? new Date(fromParam)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [appointments, payments, completedItems, newPatients, invoices] =
      await Promise.all([
        this.prisma.appointment.groupBy({
          by: ['status'],
          where: {
            clinic: { organizationId },
            startsAt: { gte: from, lte: to },
          },
          _count: { _all: true },
        }),
        this.prisma.payment.findMany({
          where: {
            receivedAt: { gte: from, lte: to },
            invoice: { patient: { organizationId } },
          },
          select: { amount: true, receivedAt: true, method: true },
        }),
        this.prisma.treatmentPlanItem.findMany({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: from, lte: to },
            treatmentPlan: { clinicalRecord: { patient: { organizationId } } },
          },
          include: {
            treatment: true,
            doctor: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        this.prisma.patient.count({
          where: {
            organizationId,
            createdAt: { gte: from, lte: to },
            deletedAt: null,
          },
        }),
        this.prisma.invoice.findMany({
          where: {
            issuedAt: { gte: from, lte: to },
            patient: { organizationId },
          },
          select: { total: true, balanceDue: true },
        }),
      ]);

    const revenueByDayMap = new Map<string, number>();
    for (const payment of payments) {
      const day = payment.receivedAt.toISOString().slice(0, 10);
      revenueByDayMap.set(
        day,
        (revenueByDayMap.get(day) ?? 0) + Number(payment.amount),
      );
    }
    const revenueByDay = Array.from(revenueByDayMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const revenueByDoctorMap = new Map<
      string,
      { doctorId: string; doctorName: string; total: number; count: number }
    >();
    const treatmentMap = new Map<
      string,
      { treatmentId: string; name: string; count: number; total: number }
    >();

    for (const item of completedItems) {
      const doctorKey = item.doctorId;
      const doctorEntry = revenueByDoctorMap.get(doctorKey) ?? {
        doctorId: item.doctorId,
        doctorName: `${item.doctor.firstName} ${item.doctor.lastName}`,
        total: 0,
        count: 0,
      };
      doctorEntry.total += Number(item.price);
      doctorEntry.count += 1;
      revenueByDoctorMap.set(doctorKey, doctorEntry);

      const treatmentEntry = treatmentMap.get(item.treatmentId) ?? {
        treatmentId: item.treatmentId,
        name: item.treatment.name,
        count: 0,
        total: 0,
      };
      treatmentEntry.count += 1;
      treatmentEntry.total += Number(item.price);
      treatmentMap.set(item.treatmentId, treatmentEntry);
    }

    const appointmentsByStatus = appointments.map((a) => ({
      status: a.status,
      count: a._count._all,
    }));
    const totalAppointments = appointmentsByStatus.reduce(
      (sum, a) => sum + a.count,
      0,
    );
    const cancelled =
      appointmentsByStatus.find((a) => a.status === 'CANCELLED')?.count ?? 0;
    const noShow =
      appointmentsByStatus.find((a) => a.status === 'NO_SHOW')?.count ?? 0;

    const totalBilled = invoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );
    const totalPending = invoices.reduce(
      (sum, inv) => sum + Number(inv.balanceDue),
      0,
    );
    const totalCollectedFromPayments = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      kpis: {
        totalRevenue: round2(totalCollectedFromPayments),
        newPatients,
        totalAppointments,
        cancellationRate:
          totalAppointments > 0
            ? round2((cancelled / totalAppointments) * 100)
            : 0,
        noShowRate:
          totalAppointments > 0
            ? round2((noShow / totalAppointments) * 100)
            : 0,
        totalBilled: round2(totalBilled),
        totalPending: round2(totalPending),
      },
      revenueByDay,
      revenueByDoctor: Array.from(revenueByDoctorMap.values())
        .map((d) => ({ ...d, total: round2(d.total) }))
        .sort((a, b) => b.total - a.total),
      topTreatments: Array.from(treatmentMap.values())
        .map((t) => ({ ...t, total: round2(t.total) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
      appointmentsByStatus,
    };
  }
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
