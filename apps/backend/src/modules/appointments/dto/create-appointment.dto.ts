import { ApiProperty } from '@nestjs/swagger';
import { AppointmentSource } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID('loose')
  clinicId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('loose')
  consultingRoomId?: string;

  @ApiProperty()
  @IsUUID('loose')
  patientId!: string;

  @ApiProperty()
  @IsUUID('loose')
  doctorId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('loose')
  treatmentId?: string;

  @ApiProperty()
  @IsDateString()
  startsAt!: string;

  @ApiProperty()
  @IsDateString()
  endsAt!: string;

  @ApiProperty({ enum: AppointmentSource, required: false })
  @IsOptional()
  @IsEnum(AppointmentSource)
  source?: AppointmentSource;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
