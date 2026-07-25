import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BroadcastAudience } from '../whatsapp.types';

export class BroadcastPreviewDto {
  @ApiProperty({ enum: BroadcastAudience })
  @IsEnum(BroadcastAudience)
  audience!: BroadcastAudience;
}
