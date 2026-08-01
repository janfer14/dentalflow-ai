import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const DOCUMENT_TYPES = ['xray', 'photo', 'id', 'other'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export class UploadDocumentDto {
  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES)
  type!: DocumentType;
}
