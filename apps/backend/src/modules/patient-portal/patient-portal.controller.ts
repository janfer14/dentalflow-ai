import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentPatient } from './decorators/current-patient.decorator';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { PatientJwtAuthGuard } from './guards/patient-jwt-auth.guard';
import { PatientPortalService } from './patient-portal.service';
import type { AuthenticatedPatient } from './types/authenticated-patient.type';

@ApiTags('patient-portal')
@Controller('portal')
export class PatientPortalController {
  constructor(private readonly portal: PatientPortalService) {}

  @Public()
  @Post('auth/request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.portal.requestOtp(dto.phone);
  }

  @Public()
  @Post('auth/verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.portal.verifyOtp(dto.phone, dto.code);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(PatientJwtAuthGuard)
  @Get('me')
  me(@CurrentPatient() patient: AuthenticatedPatient) {
    return this.portal.getProfile(patient.id);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(PatientJwtAuthGuard)
  @Get('appointments')
  listAppointments(@CurrentPatient() patient: AuthenticatedPatient) {
    return this.portal.listAppointments(patient.id);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(PatientJwtAuthGuard)
  @Post('appointments/:id/cancel')
  cancelAppointment(
    @CurrentPatient() patient: AuthenticatedPatient,
    @Param('id') id: string,
  ) {
    return this.portal.cancelAppointment(patient.id, id);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(PatientJwtAuthGuard)
  @Get('invoices')
  listInvoices(@CurrentPatient() patient: AuthenticatedPatient) {
    return this.portal.listInvoices(patient.id);
  }
}
