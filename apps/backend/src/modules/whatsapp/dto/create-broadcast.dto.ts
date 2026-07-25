import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { BroadcastAudience } from '../whatsapp.types';

export class CreateBroadcastDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  message!: string;

  @ApiProperty({ enum: BroadcastAudience })
  @IsEnum(BroadcastAudience)
  audience!: BroadcastAudience;
}
