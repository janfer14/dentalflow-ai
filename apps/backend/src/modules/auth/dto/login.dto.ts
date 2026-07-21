import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'doctor@dentalflow.ai' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'S3cur3P@ssword!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    required: false,
    description: '6-digit TOTP code, required when 2FA is enabled',
  })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}
