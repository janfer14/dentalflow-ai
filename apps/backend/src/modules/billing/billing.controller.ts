import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { BillingService } from './billing.service';
import { CloseSessionDto, OpenSessionDto } from './dto/cash-session.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('invoices')
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.billing.createInvoice(dto);
  }

  @Get('invoices')
  listInvoices(@Query() query: ListInvoicesDto) {
    return this.billing.listInvoices(query);
  }

  @Get('invoices/:id')
  getInvoice(@Param('id') id: string) {
    return this.billing.getInvoice(id);
  }

  @Post('invoices/:id/payments')
  registerPayment(@Param('id') id: string, @Body() dto: RegisterPaymentDto) {
    return this.billing.registerPayment(id, dto);
  }

  @Get('accounts-receivable')
  listAccountsReceivable(@Query('patientId') patientId?: string) {
    return this.billing.listAccountsReceivable(patientId);
  }

  @Get('cash-registers')
  listCashRegisters(@Query('clinicId') clinicId?: string) {
    return this.billing.listCashRegisters(clinicId);
  }

  @Post('cash-registers/sessions')
  openSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OpenSessionDto,
  ) {
    return this.billing.openSession(user.id, dto);
  }

  @Post('cash-registers/sessions/:id/close')
  closeSession(@Param('id') id: string, @Body() dto: CloseSessionDto) {
    return this.billing.closeSession(id, dto);
  }

  @Get('cash-registers/:cashRegisterId/sessions')
  listSessions(@Param('cashRegisterId') cashRegisterId: string) {
    return this.billing.listSessions(cashRegisterId);
  }
}
