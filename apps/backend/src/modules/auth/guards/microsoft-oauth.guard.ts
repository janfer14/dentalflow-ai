import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MicrosoftOAuthGuard extends AuthGuard('microsoft') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.get<string>('oauth.microsoft.clientId')) {
      throw new ServiceUnavailableException(
        'El inicio de sesión con Microsoft no está configurado. Define MICROSOFT_CLIENT_ID y MICROSOFT_CLIENT_SECRET en el backend.',
      );
    }
    return super.canActivate(context) as boolean;
  }
}
