import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { DirectoryService } from './directory.service';

@ApiTags('directory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('clinics')
  listClinics(@CurrentUser() user: AuthenticatedUser) {
    return this.directoryService.listClinics(user.organizationId);
  }

  @Get('doctors')
  listDoctors(@CurrentUser() user: AuthenticatedUser) {
    return this.directoryService.listDoctors(user.organizationId);
  }

  @Get('treatments')
  listTreatments(@CurrentUser() user: AuthenticatedUser) {
    return this.directoryService.listTreatments(user.organizationId);
  }
}
