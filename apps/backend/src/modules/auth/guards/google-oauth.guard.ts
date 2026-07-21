import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.get<string>('oauth.google.clientId')) {
      throw new ServiceUnavailableException(
        'El inicio de sesión con Google no está configurado. Define GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el backend.',
      );
    }
    return super.canActivate(context) as boolean;
  }
}
