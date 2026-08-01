import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from '../ai/ai.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MicrosoftOAuthGuard } from './guards/microsoft-oauth.guard';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly whatsAppService: WhatsAppService,
    private readonly aiService: AiService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const user = await this.authService.validateCredentials(
      dto.email,
      dto.password,
      dto.twoFactorCode,
    );
    const tokens = await this.authService.issueTokens(user.id, req.ip);
    return { user: this.authService.toAuthenticatedUser(user), ...tokens };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, req.ip);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.revokeRefreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('integrations-status')
  integrationsStatus() {
    return {
      whatsapp: this.whatsAppService.getStatus(),
      ai: this.aiService.getStatus(),
      google: {
        configured: Boolean(this.config.get<string>('oauth.google.clientId')),
      },
      microsoft: {
        configured: Boolean(
          this.config.get<string>('oauth.microsoft.clientId'),
        ),
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  async generateTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.generateTwoFactorSecret(user.id, user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async enableTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Body('code') code: string,
  ) {
    await this.authService.enableTwoFactor(user.id, code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DisableTwoFactorDto,
  ) {
    await this.authService.disableTwoFactor(user.id, dto.currentPassword);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiExcludeEndpoint()
  googleLogin() {
    // Passport redirects to Google; handler body never runs.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    await this.handleOAuthCallback(req, res);
  }

  @Public()
  @Get('microsoft')
  @UseGuards(MicrosoftOAuthGuard)
  @ApiExcludeEndpoint()
  microsoftLogin() {
    // Passport redirects to Microsoft; handler body never runs.
  }

  @Public()
  @Get('microsoft/callback')
  @UseGuards(MicrosoftOAuthGuard)
  @ApiExcludeEndpoint()
  async microsoftCallback(@Req() req: Request, @Res() res: Response) {
    await this.handleOAuthCallback(req, res);
  }

  private async handleOAuthCallback(req: Request, res: Response) {
    const profile = req.user as { email?: string };
    const frontendUrl = this.config.get<string>('corsOrigin');

    if (!profile?.email) {
      res.redirect(`${frontendUrl}/login?error=oauth_no_email`);
      return;
    }

    try {
      const result = await this.authService.loginWithOAuthEmail(profile.email);
      res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${encodeURIComponent(result.accessToken)}&refreshToken=${encodeURIComponent(result.refreshToken)}`,
      );
    } catch {
      res.redirect(`${frontendUrl}/login?error=oauth_no_account`);
    }
  }
}
