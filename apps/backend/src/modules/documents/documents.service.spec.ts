import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

function firstCallArg<T>(mockFn: { mock: { calls: unknown[][] } }): T {
  return mockFn.mock.calls[0]?.[0] as T;
}

function buildService() {
  const prisma = {
    patientDocument: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn().mockResolvedValue({}),
    },
    consent: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
  const storage = {
    upload: jest.fn().mockResolvedValue('http://localhost:3001/uploads/key'),
    delete: jest.fn().mockResolvedValue(undefined),
    keyFromUrl: jest.fn((url: string) => url.split('/uploads/')[1]),
  };
  const patients = {
    findOne: jest.fn().mockResolvedValue({ id: 'patient-1' }),
  };

  const service = new DocumentsService(
    prisma as never,
    storage as never,
    patients as never,
  );
  return { service, prisma, storage, patients };
}

function fakeFile(overrides: Partial<Express.Multer.File> = {}) {
  return {
    originalname: 'radiografia 01.png',
    mimetype: 'image/png',
    buffer: Buffer.from('fake-bytes'),
    ...overrides,
  } as Express.Multer.File;
}

describe('DocumentsService — patient ownership scoping', () => {
  it('listDocuments rejects when the patient is not in the caller organization', async () => {
    const { service, patients } = buildService();
    patients.findOne.mockRejectedValue(new NotFoundException());

    await expect(service.listDocuments('org-1', 'patient-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('uploadDocument checks patient ownership before uploading', async () => {
    const { service, patients, storage } = buildService();
    patients.findOne.mockRejectedValue(new NotFoundException());

    await expect(
      service.uploadDocument('org-1', 'patient-1', fakeFile(), 'xray'),
    ).rejects.toThrow(NotFoundException);
    expect(storage.upload).not.toHaveBeenCalled();
  });
});

describe('DocumentsService.uploadDocument', () => {
  it('sanitizes the filename in the storage key and records the original name', async () => {
    const { service, prisma, storage } = buildService();
    prisma.patientDocument.create.mockResolvedValue({ id: 'doc-1' });

    await service.uploadDocument('org-1', 'patient-1', fakeFile(), 'xray');

    const [key] = storage.upload.mock.calls[0] as [string, Buffer, string];
    expect(key).toMatch(
      /^patients\/patient-1\/documents\/.+-radiografia_01\.png$/,
    );
    const call = firstCallArg<{
      data: {
        patientId: string;
        type: string;
        fileName: string;
        fileUrl: string;
      };
    }>(prisma.patientDocument.create);
    expect(call.data).toEqual({
      patientId: 'patient-1',
      type: 'xray',
      fileUrl: 'http://localhost:3001/uploads/key',
      fileName: 'radiografia 01.png',
    });
  });
});

describe('DocumentsService.deleteDocument', () => {
  it('throws when the document does not belong to the caller organization', async () => {
    const { service, prisma } = buildService();
    prisma.patientDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      fileUrl: 'http://localhost:3001/uploads/key',
      patient: { organizationId: 'other-org' },
    });

    await expect(service.deleteDocument('org-1', 'doc-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws when the document does not exist', async () => {
    const { service, prisma } = buildService();
    prisma.patientDocument.findUnique.mockResolvedValue(null);

    await expect(service.deleteDocument('org-1', 'doc-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deletes the stored file before deleting the row', async () => {
    const { service, prisma, storage } = buildService();
    prisma.patientDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      fileUrl: 'http://localhost:3001/uploads/patients/p1/documents/key.png',
      patient: { organizationId: 'org-1' },
    });

    await service.deleteDocument('org-1', 'doc-1');

    expect(storage.delete).toHaveBeenCalledWith(
      'patients/p1/documents/key.png',
    );
    expect(prisma.patientDocument.delete).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
    });
  });
});

describe('DocumentsService.uploadConsent', () => {
  it('stamps signedAt at upload time (treated as an already-signed scan)', async () => {
    const { service, prisma } = buildService();
    prisma.consent.create.mockResolvedValue({ id: 'consent-1' });

    await service.uploadConsent(
      'org-1',
      'patient-1',
      fakeFile({
        originalname: 'consentimiento.pdf',
        mimetype: 'application/pdf',
      }),
      'Consentimiento informado',
    );

    const call = firstCallArg<{
      data: { patientId: string; title: string; signedAt: Date };
    }>(prisma.consent.create);
    expect(call.data.patientId).toBe('patient-1');
    expect(call.data.title).toBe('Consentimiento informado');
    expect(call.data.signedAt).toBeInstanceOf(Date);
  });
});

describe('DocumentsService.deleteConsent', () => {
  it('throws when the consent does not belong to the caller organization', async () => {
    const { service, prisma } = buildService();
    prisma.consent.findUnique.mockResolvedValue({
      id: 'consent-1',
      documentUrl: 'http://localhost:3001/uploads/key',
      patient: { organizationId: 'other-org' },
    });

    await expect(service.deleteConsent('org-1', 'consent-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
