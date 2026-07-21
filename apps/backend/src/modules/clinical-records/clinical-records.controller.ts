import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ClinicalRecordsService } from './clinical-records.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { UpdateToothDto } from './dto/update-tooth.dto';
import { UpdateTreatmentPlanItemDto } from './dto/update-treatment-plan-item.dto';

@ApiTags('clinical-records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ClinicalRecordsController {
  constructor(private readonly clinicalRecords: ClinicalRecordsService) {}

  @Get('patients/:patientId/clinical-record')
  getSummary(@Param('patientId') patientId: string) {
    return this.clinicalRecords.getSummary(patientId);
  }

  @Post('patients/:patientId/clinical-record/notes')
  addNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.clinicalRecords.addNote(patientId, user.id, dto);
  }

  @Put('patients/:patientId/clinical-record/odontogram/:toothNumber')
  updateTooth(
    @Param('patientId') patientId: string,
    @Param('toothNumber', ParseIntPipe) toothNumber: number,
    @Body() dto: UpdateToothDto,
  ) {
    return this.clinicalRecords.updateTooth(patientId, toothNumber, dto);
  }

  @Post('patients/:patientId/clinical-record/treatment-plans')
  createTreatmentPlan(
    @Param('patientId') patientId: string,
    @Body() dto: CreateTreatmentPlanDto,
  ) {
    return this.clinicalRecords.createTreatmentPlan(patientId, dto);
  }

  @Patch('clinical-record/treatment-plan-items/:id')
  updateTreatmentPlanItem(
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentPlanItemDto,
  ) {
    return this.clinicalRecords.updateTreatmentPlanItem(id, dto);
  }

  @Post('patients/:patientId/clinical-record/prescriptions')
  createPrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.clinicalRecords.createPrescription(patientId, user.id, dto);
  }
}
