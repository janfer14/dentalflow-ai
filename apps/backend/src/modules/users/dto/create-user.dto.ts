import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDoctor?: boolean;

  @ApiProperty()
  @IsUUID('loose')
  roleId!: string;

  @ApiProperty()
  @IsUUID('loose')
  clinicId!: string;
}

export class CreateUserResponseDto {
  user!: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description:
      'Contraseña temporal en texto plano — solo se devuelve en esta respuesta, no se puede recuperar después.',
  })
  temporaryPassword!: string;
}
