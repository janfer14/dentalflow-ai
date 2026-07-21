import { ApiProperty } from '@nestjs/swagger';
import { TreatmentPlanItemStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTreatmentPlanItemDto {
  @ApiProperty({ enum: TreatmentPlanItemStatus })
  @IsEnum(TreatmentPlanItemStatus)
  status!: TreatmentPlanItemStatus;
}
