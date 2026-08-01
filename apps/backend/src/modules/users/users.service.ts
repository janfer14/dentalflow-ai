import { Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_LIST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  isDoctor: true,
  status: true,
  createdAt: true,
  lastLoginAt: true,
  roles: { select: { role: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { firstName: 'asc' },
      select: USER_LIST_SELECT,
    });
  }

  async listRoles(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async createUser(organizationId: string, dto: CreateUserDto) {
    const temporaryPassword = randomBytes(9).toString('base64url');
    const passwordHash = (await argon2.hash(temporaryPassword)) as string;

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        isDoctor: dto.isDoctor ?? false,
        roles: { create: { roleId: dto.roleId } },
        clinics: { create: { clinicId: dto.clinicId } },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    return { user, temporaryPassword };
  }

  async updateUser(organizationId: string, id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.roleId) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.create({
        data: { userId: id, roleId: dto.roleId },
      });
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isDoctor: dto.isDoctor,
        status: dto.status,
      },
      select: USER_LIST_SELECT,
    });
  }
}
