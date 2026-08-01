import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { StorageService } from '../storage/storage.service';
import { sanitizeFilename } from './documents.constants';
import type { DocumentType } from './dto/upload-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly patients: PatientsService,
  ) {}

  async listDocuments(organizationId: string, patientId: string) {
    await this.patients.findOne(organizationId, patientId);
    return this.prisma.patientDocument.findMany({
      where: { patientId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async uploadDocument(
    organizationId: string,
    patientId: string,
    file: Express.Multer.File,
    type: DocumentType,
  ) {
    await this.patients.findOne(organizationId, patientId);
    const key = `patients/${patientId}/documents/${randomUUID()}-${sanitizeFilename(file.originalname)}`;
    const fileUrl = await this.storage.upload(key, file.buffer, file.mimetype);
    return this.prisma.patientDocument.create({
      data: { patientId, type, fileUrl, fileName: file.originalname },
    });
  }

  async deleteDocument(organizationId: string, id: string) {
    const document = await this.prisma.patientDocument.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!document || document.patient.organizationId !== organizationId) {
      throw new NotFoundException('Documento no encontrado');
    }
    await this.storage.delete(this.storage.keyFromUrl(document.fileUrl));
    await this.prisma.patientDocument.delete({ where: { id } });
  }

  async listConsents(organizationId: string, patientId: string) {
    await this.patients.findOne(organizationId, patientId);
    return this.prisma.consent.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadConsent(
    organizationId: string,
    patientId: string,
    file: Express.Multer.File,
    title: string,
  ) {
    await this.patients.findOne(organizationId, patientId);
    const key = `patients/${patientId}/consents/${randomUUID()}-${sanitizeFilename(file.originalname)}`;
    const documentUrl = await this.storage.upload(
      key,
      file.buffer,
      file.mimetype,
    );
    return this.prisma.consent.create({
      data: { patientId, title, documentUrl, signedAt: new Date() },
    });
  }

  async deleteConsent(organizationId: string, id: string) {
    const consent = await this.prisma.consent.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!consent || consent.patient.organizationId !== organizationId) {
      throw new NotFoundException('Consentimiento no encontrado');
    }
    await this.storage.delete(this.storage.keyFromUrl(consent.documentUrl));
    await this.prisma.consent.delete({ where: { id } });
  }
}
