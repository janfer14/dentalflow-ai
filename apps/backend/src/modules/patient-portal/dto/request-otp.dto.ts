import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '+52 55 1234 5678' })
  @IsString()
  @MinLength(8)
  phone!: string;
}
