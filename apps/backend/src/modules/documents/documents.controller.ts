import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { DOCUMENT_UPLOAD_OPTIONS } from './documents.constants';
import { DocumentsService } from './documents.service';
import { UploadConsentDto } from './dto/upload-consent.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('patients/:patientId/documents')
  listDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.documents.listDocuments(user.organizationId, patientId);
  }

  @Post('patients/:patientId/documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', DOCUMENT_UPLOAD_OPTIONS))
  uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.documents.uploadDocument(
      user.organizationId,
      patientId,
      file,
      dto.type,
    );
  }

  @Delete('documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.documents.deleteDocument(user.organizationId, id);
  }

  @Get('patients/:patientId/consents')
  listConsents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.documents.listConsents(user.organizationId, patientId);
  }

  @Post('patients/:patientId/consents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', DOCUMENT_UPLOAD_OPTIONS))
  uploadConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadConsentDto,
  ) {
    return this.documents.uploadConsent(
      user.organizationId,
      patientId,
      file,
      dto.title,
    );
  }

  @Delete('consents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.documents.deleteConsent(user.organizationId, id);
  }
}
