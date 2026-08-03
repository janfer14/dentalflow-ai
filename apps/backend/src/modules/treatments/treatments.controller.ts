import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { TreatmentsService } from './treatments.service';

@ApiTags('treatments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('Administrador')
@Controller()
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  @Post('treatments')
  createTreatment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTreatmentDto,
  ) {
    return this.treatmentsService.createTreatment(user.organizationId, dto);
  }

  @Patch('treatments/:id')
  updateTreatment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentDto,
  ) {
    return this.treatmentsService.updateTreatment(user.organizationId, id, dto);
  }
}
