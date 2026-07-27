import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, MicrosoftStrategyOptions } from 'passport-microsoft';
import type OAuth2Strategy from 'passport-oauth2';

interface MicrosoftProfile {
  emails?: { value: string }[];
  name?: { givenName?: string; familyName?: string };
  displayName?: string;
}

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(config: ConfigService) {
    const options: MicrosoftStrategyOptions & { addUPNAsEmail?: boolean } = {
      clientID:
        config.get<string>('oauth.microsoft.clientId') || 'not-configured',
      clientSecret:
        config.get<string>('oauth.microsoft.clientSecret') || 'not-configured',
      callbackURL: config.get<string>('oauth.microsoft.callbackUrl'),
      tenant: config.get<string>('oauth.microsoft.tenant') || 'common',
      scope: ['user.read'],
      // The work/school `mail` field is sometimes empty for accounts
      // provisioned without an Exchange mailbox — falling back to the
      // userPrincipalName (always present, formatted like an email) keeps
      // login working for those tenants too.
      addUPNAsEmail: true,
    };
    super(options);
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: MicrosoftProfile,
    done: OAuth2Strategy.VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    done(null, {
      email,
      firstName: profile.name?.givenName ?? profile.displayName,
      lastName: profile.name?.familyName ?? '',
    });
  }
}
