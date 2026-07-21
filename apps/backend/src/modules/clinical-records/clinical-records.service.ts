import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { UpdateToothDto } from './dto/update-tooth.dto';
import { UpdateTreatmentPlanItemDto } from './dto/update-treatment-plan-item.dto';

const DOCTOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class ClinicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateForPatient(patientId: string) {
    const existing = await this.prisma.clinicalRecord.findUnique({
      where: { patientId },
    });
    if (existing) return existing;

    return this.prisma.clinicalRecord.create({
      data: {
        patientId,
        odontogram: { create: {} },
      },
    });
  }

  async getSummary(patientId: string) {
    const record = await this.getOrCreateForPatient(patientId);

    const [clinicalNotes, odontogram, treatmentPlans, prescriptions] =
      await Promise.all([
        this.prisma.clinicalNote.findMany({
          where: { clinicalRecordId: record.id },
          orderBy: { createdAt: 'desc' },
          include: { doctor: { select: DOCTOR_SELECT } },
        }),
        this.prisma.odontogram.findUnique({
          where: { clinicalRecordId: record.id },
          include: { teeth: true },
        }),
        this.prisma.treatmentPlan.findMany({
          where: { clinicalRecordId: record.id },
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: { treatment: true, doctor: { select: DOCTOR_SELECT } },
            },
          },
        }),
        this.prisma.prescription.findMany({
          where: { clinicalRecordId: record.id },
          orderBy: { createdAt: 'desc' },
          include: { items: true, doctor: { select: DOCTOR_SELECT } },
        }),
      ]);

    return { record, clinicalNotes, odontogram, treatmentPlans, prescriptions };
  }

  async addNote(patientId: string, doctorId: string, dto: CreateNoteDto) {
    const record = await this.getOrCreateForPatient(patientId);
    return this.prisma.clinicalNote.create({
      data: {
        clinicalRecordId: record.id,
        doctorId,
        content: dto.content,
        diagnosis: dto.diagnosis,
      },
      include: { doctor: { select: DOCTOR_SELECT } },
    });
  }

  async updateTooth(
    patientId: string,
    toothNumber: number,
    dto: UpdateToothDto,
  ) {
    const record = await this.getOrCreateForPatient(patientId);
    const odontogram = await this.prisma.odontogram.upsert({
      where: { clinicalRecordId: record.id },
      update: {},
      create: { clinicalRecordId: record.id },
    });

    const conditions = dto.conditions.map((c) => ({
      ...c,
      notedAt: new Date().toISOString(),
    }));

    return this.prisma.odontogramTooth.upsert({
      where: {
        odontogramId_toothNumber: { odontogramId: odontogram.id, toothNumber },
      },
      update: { conditions, notes: dto.notes },
      create: {
        odontogramId: odontogram.id,
        toothNumber,
        conditions,
        notes: dto.notes,
      },
    });
  }

  async createTreatmentPlan(patientId: string, dto: CreateTreatmentPlanDto) {
    const record = await this.getOrCreateForPatient(patientId);
    return this.prisma.treatmentPlan.create({
      data: {
        clinicalRecordId: record.id,
        title: dto.title,
        items: {
          create: dto.items.map((item) => ({
            treatmentId: item.treatmentId,
            doctorId: item.doctorId,
            toothNumber: item.toothNumber,
            cost: item.cost,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: { treatment: true, doctor: { select: DOCTOR_SELECT } },
        },
      },
    });
  }

  async updateTreatmentPlanItem(
    itemId: string,
    dto: UpdateTreatmentPlanItemDto,
  ) {
    const item = await this.prisma.treatmentPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException(
        'Elemento del plan de tratamiento no encontrado',
      );
    }

    return this.prisma.treatmentPlanItem.update({
      where: { id: itemId },
      data: {
        status: dto.status,
        completedAt: dto.status === 'COMPLETED' ? new Date() : item.completedAt,
      },
      include: { treatment: true, doctor: { select: DOCTOR_SELECT } },
    });
  }

  async createPrescription(
    patientId: string,
    doctorId: string,
    dto: CreatePrescriptionDto,
  ) {
    const record = await this.getOrCreateForPatient(patientId);
    return this.prisma.prescription.create({
      data: {
        clinicalRecordId: record.id,
        doctorId,
        notes: dto.notes,
        items: { create: dto.items },
      },
      include: { items: true, doctor: { select: DOCTOR_SELECT } },
    });
  }
}
