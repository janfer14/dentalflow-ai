import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateTreatmentPlanItemDto {
  @ApiProperty()
  @IsUUID('loose')
  treatmentId!: string;

  @ApiProperty()
  @IsUUID('loose')
  doctorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  toothNumber?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cost!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;
}

export class CreateTreatmentPlanDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ type: [CreateTreatmentPlanItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTreatmentPlanItemDto)
  items!: CreateTreatmentPlanItemDto[];
}
