import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListAppointmentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('loose')
  clinicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('loose')
  doctorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('loose')
  patientId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'ISO date, start of range' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date, end of range' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
