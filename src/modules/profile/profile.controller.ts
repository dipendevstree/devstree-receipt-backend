import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ReqContext } from 'src/common/decorators/request-context.decorator';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import {
  PasswordUpdateResponseDto,
  ProfileResponseDto,
  UpdateAccountPasswordDto,
  UpdateFinancePasswordDto,
  UpdateProfileDto,
} from './dto/profile.dto';
import { ProfileService } from './profile.service';

/**
 * Everything here acts on the caller's own account, resolved from the JWT.
 * No route accepts a user id, so no permission check is needed beyond being
 * authenticated — and none can be bypassed by sending someone else's id.
 */
@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'The signed-in administrator’s profile',
    description:
      'Identity is taken from the authenticated request. No password hash, token or encryption detail is included.',
  })
  @ApiOkResponse({ type: ProfileResponseDto })
  get(@CurrentUser() user: AuthenticatedUser): Promise<ProfileResponseDto> {
    return this.profileService.getProfile(user);
  }

  @Patch()
  @ApiOperation({ summary: 'Update your own name, email or mobile number' })
  @ApiOkResponse({ type: ProfileResponseDto })
  update(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateProfile(dto, user, context);
  }

  @Patch('account-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @ApiOperation({
    summary: 'Change the account (sign-in) password',
    description:
      'Verifies the current password, then revokes every issued token for this administrator. Sign in again with the new password.',
  })
  @ApiOkResponse({ type: PasswordUpdateResponseDto })
  async updateAccountPassword(
    @Body() dto: UpdateAccountPasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<PasswordUpdateResponseDto> {
    await this.profileService.updateAccountPassword(dto, user, context);
    return {
      message: 'Account password updated. Please sign in again with your new password.',
      reauthenticationRequired: true,
    };
  }

  @Patch('finance-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @ApiOperation({
    summary: 'Change the finance password used to unlock financial information',
    description:
      'Separate credential from the sign-in password. Active financial unlock sessions are revoked; the login session is not affected.',
  })
  @ApiOkResponse({ type: PasswordUpdateResponseDto })
  async updateFinancePassword(
    @Body() dto: UpdateFinancePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<PasswordUpdateResponseDto> {
    await this.profileService.updateFinancePassword(dto, user, context);
    return {
      message:
        'Finance password updated. Financial information has been locked — unlock again with the new password.',
      reauthenticationRequired: false,
    };
  }
}
