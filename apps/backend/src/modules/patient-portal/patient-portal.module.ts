import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PatientPortalController } from './patient-portal.controller';
import { PatientPortalService } from './patient-portal.service';
import { PatientJwtStrategy } from './strategies/patient-jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({}), WhatsAppModule],
  controllers: [PatientPortalController],
  providers: [PatientPortalService, PatientJwtStrategy],
})
export class PatientPortalModule {}
