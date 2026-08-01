import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Injectable()
export class DirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async updateClinic(organizationId: string, id: string, dto: UpdateClinicDto) {
    const existing = await this.prisma.clinic.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Clínica no encontrada');
    }
    return this.prisma.clinic.update({ where: { id }, data: dto });
  }

  async listClinics(organizationId: string) {
    return this.prisma.clinic.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
      include: { consultingRooms: { where: { isActive: true } } },
    });
  }

  async listDoctors(organizationId: string) {
    return this.prisma.user.findMany({
      where: {
        organizationId,
        isDoctor: true,
        deletedAt: null,
        status: 'ACTIVE',
      },
      orderBy: { firstName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        specialtyId: true,
      },
    });
  }

  async listTreatments(organizationId: string) {
    return this.prisma.treatment.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
