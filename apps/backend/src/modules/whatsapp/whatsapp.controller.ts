import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { BroadcastPreviewDto } from './dto/broadcast-preview.dto';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { WhatsAppService } from './whatsapp.service';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  @Public()
  @Get('webhook')
  @ApiExcludeEndpoint()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.whatsapp.verifyWebhookChallenge(mode, token, challenge);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: Parameters<WhatsAppService['handleWebhookEvent']>[0],
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    if (!this.whatsapp.verifySignature(req.rawBody, signature)) {
      throw new ForbiddenException('Firma de webhook inválida');
    }
    await this.whatsapp.handleWebhookEvent(body);
    return { received: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('status')
  status() {
    return this.whatsapp.getStatus();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('templates')
  listTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.whatsapp.listTemplates(user.organizationId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('templates/:key')
  updateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.whatsapp.updateTemplate(user.organizationId, key, dto.body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('broadcasts/preview')
  previewBroadcast(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BroadcastPreviewDto,
  ) {
    return this.whatsapp
      .resolveBroadcastAudience(user.organizationId, query.audience)
      .then((patients) => ({ audienceCount: patients.length }));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('broadcasts')
  createBroadcast(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBroadcastDto,
  ) {
    return this.whatsapp.createBroadcast(user.organizationId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('messages/:patientId')
  listMessages(@Param('patientId') patientId: string) {
    return this.whatsapp.listMessages(patientId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('messages/:patientId')
  sendMessage(
    @Param('patientId') patientId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.whatsapp.sendTextMessage(patientId, dto.body);
  }
}
