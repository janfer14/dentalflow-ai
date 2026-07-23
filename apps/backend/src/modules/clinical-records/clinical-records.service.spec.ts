import { NotFoundException } from '@nestjs/common';
import { ClinicalRecordsService } from './clinical-records.service';

function firstCallArg<T>(mockFn: { mock: { calls: unknown[][] } }): T {
  return mockFn.mock.calls[0]?.[0] as T;
}

function buildService() {
  const prisma = {
    clinicalRecord: { findUnique: jest.fn(), create: jest.fn() },
    clinicalNote: { create: jest.fn(), findMany: jest.fn() },
    odontogram: { findUnique: jest.fn(), upsert: jest.fn() },
    odontogramTooth: { upsert: jest.fn() },
    treatmentPlan: { create: jest.fn(), findMany: jest.fn() },
    treatmentPlanItem: { findUnique: jest.fn(), update: jest.fn() },
    prescription: { create: jest.fn(), findMany: jest.fn() },
  };

  const service = new ClinicalRecordsService(prisma as never);
  return { service, prisma };
}

describe('ClinicalRecordsService.getOrCreateForPatient', () => {
  it('returns the existing record without creating a new one', async () => {
    const { service, prisma } = buildService();
    prisma.clinicalRecord.findUnique.mockResolvedValue({
      id: 'record-1',
      patientId: 'patient-1',
    });

    const result = await service.getOrCreateForPatient('patient-1');

    expect(result).toEqual({ id: 'record-1', patientId: 'patient-1' });
    expect(prisma.clinicalRecord.create).not.toHaveBeenCalled();
  });

  it('creates a record with an odontogram when none exists', async () => {
    const { service, prisma } = buildService();
    prisma.clinicalRecord.findUnique.mockResolvedValue(null);
    prisma.clinicalRecord.create.mockResolvedValue({ id: 'record-new' });

    await service.getOrCreateForPatient('patient-1');

    expect(prisma.clinicalRecord.create).toHaveBeenCalledWith({
      data: { patientId: 'patient-1', odontogram: { create: {} } },
    });
  });
});

describe('ClinicalRecordsService.updateTooth', () => {
  it('upserts the odontogram then the tooth, stamping conditions with notedAt', async () => {
    const { service, prisma } = buildService();
    prisma.clinicalRecord.findUnique.mockResolvedValue({ id: 'record-1' });
    prisma.odontogram.upsert.mockResolvedValue({ id: 'odontogram-1' });
    prisma.odontogramTooth.upsert.mockResolvedValue({ id: 'tooth-1' });

    await service.updateTooth('patient-1', 11, {
      conditions: [{ type: 'CARIES', surface: 'oclusal' }],
      notes: 'sensible al frio',
    } as never);

    expect(prisma.odontogram.upsert).toHaveBeenCalledWith({
      where: { clinicalRecordId: 'record-1' },
      update: {},
      create: { clinicalRecordId: 'record-1' },
    });

    const call = firstCallArg<{
      where: {
        odontogramId_toothNumber: { odontogramId: string; toothNumber: number };
      };
      update: { conditions: Array<{ notedAt: string }>; notes: string };
    }>(prisma.odontogramTooth.upsert);
    expect(call.where.odontogramId_toothNumber).toEqual({
      odontogramId: 'odontogram-1',
      toothNumber: 11,
    });
    expect(typeof call.update.conditions[0].notedAt).toBe('string');
    expect(call.update.notes).toBe('sensible al frio');
  });
});

describe('ClinicalRecordsService.updateTreatmentPlanItem', () => {
  it('throws NotFoundException when the item does not exist', async () => {
    const { service, prisma } = buildService();
    prisma.treatmentPlanItem.findUnique.mockResolvedValue(null);

    await expect(
      service.updateTreatmentPlanItem('missing', {
        status: 'COMPLETED',
      } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('stamps completedAt when the status transitions to COMPLETED', async () => {
    const { service, prisma } = buildService();
    prisma.treatmentPlanItem.findUnique.mockResolvedValue({
      id: 'item-1',
      completedAt: null,
    });
    prisma.treatmentPlanItem.update.mockResolvedValue({});

    await service.updateTreatmentPlanItem('item-1', {
      status: 'COMPLETED',
    } as never);

    const call = firstCallArg<{
      data: { completedAt: Date | null };
    }>(prisma.treatmentPlanItem.update);
    expect(call.data.completedAt).toBeInstanceOf(Date);
  });

  it('leaves completedAt untouched for a non-completed status', async () => {
    const { service, prisma } = buildService();
    const previousCompletedAt = new Date('2026-01-01T00:00:00Z');
    prisma.treatmentPlanItem.findUnique.mockResolvedValue({
      id: 'item-1',
      completedAt: previousCompletedAt,
    });
    prisma.treatmentPlanItem.update.mockResolvedValue({});

    await service.updateTreatmentPlanItem('item-1', {
      status: 'IN_PROGRESS',
    } as never);

    const call = firstCallArg<{
      data: { completedAt: Date | null };
    }>(prisma.treatmentPlanItem.update);
    expect(call.data.completedAt).toBe(previousCompletedAt);
  });
});
