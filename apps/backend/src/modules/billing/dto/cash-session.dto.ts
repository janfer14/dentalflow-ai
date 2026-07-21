import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class OpenSessionDto {
  @ApiProperty()
  @IsUUID('loose')
  cashRegisterId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  openingAmount!: number;
}

export class CloseSessionDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  closingAmount!: number;
}
