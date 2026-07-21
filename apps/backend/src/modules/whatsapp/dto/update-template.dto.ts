import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateTemplateDto {
  @ApiProperty({
    description:
      'Cuerpo de la plantilla. Usa {{1}}, {{2}}, etc. como marcadores.',
  })
  @IsString()
  @MinLength(1)
  body!: string;
}
