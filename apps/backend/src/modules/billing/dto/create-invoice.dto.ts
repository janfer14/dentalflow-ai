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

export class InvoiceItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  quantity: number = 1;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('loose')
  treatmentPlanItemId?: string;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID('loose')
  patientId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('loose')
  appointmentId?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];

  @ApiPropertyOptional({
    description: 'Tasa de impuesto, ej. 0.16 para 16% IVA',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}
