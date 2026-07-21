import { ApiPropertyOptional } from '@nestjs/swagger';
import { AiConversationParticipant } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({
    enum: AiConversationParticipant,
    default: 'RECEPTION',
  })
  @IsOptional()
  @IsEnum(AiConversationParticipant)
  participant?: AiConversationParticipant;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('loose')
  patientId?: string;
}
