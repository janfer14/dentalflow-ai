import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DirectoryService {
  constructor(private readonly prisma: PrismaService) {}

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
