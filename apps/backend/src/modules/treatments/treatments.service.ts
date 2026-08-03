import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';

@Injectable()
export class TreatmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTreatment(organizationId: string, dto: CreateTreatmentDto) {
    return this.prisma.treatment.create({
      data: {
        organizationId,
        name: dto.name,
        defaultPrice: dto.defaultPrice,
        defaultCost: dto.defaultCost ?? 0,
        durationMinutes: dto.durationMinutes ?? 30,
      },
    });
  }

  async updateTreatment(
    organizationId: string,
    id: string,
    dto: UpdateTreatmentDto,
  ) {
    const existing = await this.prisma.treatment.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException('Tratamiento no encontrado');
    }
    return this.prisma.treatment.update({ where: { id }, data: dto });
  }
}
