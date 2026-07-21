import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ToothConditionDto {
  @ApiProperty({ example: 'oclusal' })
  @IsString()
  surface!: string;

  @ApiProperty({ example: 'caries' })
  @IsString()
  condition!: string;
}

export class UpdateToothDto {
  @ApiProperty({ type: [ToothConditionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToothConditionDto)
  conditions!: ToothConditionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
