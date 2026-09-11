import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { ReqContext } from 'src/common/decorators/request-context.decorator';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';
import {
  AuthUserDto,
  ForgotPasswordDto,
  LoginDto,
  LoginResponseDto,
  LogoutDto,
  RefreshTokenDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @ApiOperation({ summary: 'Sign in with email or mobile number' })
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() dto: LoginDto, @ReqContext() context: RequestContext): Promise<LoginResponseDto> {
    return this.authService.login(dto.identifier, dto.password, context);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token (rotating)' })
  @ApiOkResponse({ type: LoginResponseDto })
  refresh(
    @Body() dto: RefreshTokenDto,
    @ReqContext() context: RequestContext,
  ): Promise<LoginResponseDto> {
    return this.authService.refresh(dto.refreshToken, context);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign out — also locks financial information immediately' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto,
    @ReqContext() context: RequestContext,
  ): Promise<{ message: string }> {
    await this.authService.logout(user, dto.refreshToken, context);
    return { message: 'Signed out successfully.' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @ApiOperation({
    summary: 'Request a password reset link',
    description: 'Always returns success so the endpoint cannot be used to enumerate accounts.',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @ReqContext() context: RequestContext,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email, context);
    return {
      message: 'If an account exists for that email address, a reset link has been sent.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ApiOperation({ summary: 'Complete a password reset' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @ReqContext() context: RequestContext,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.newPassword, context);
    return { message: 'Password updated. Please sign in with your new password.' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current session identity and permissions' })
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
