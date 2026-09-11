import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { ReqContext } from 'src/common/decorators/request-context.decorator';
import { Permission } from 'src/common/enums/permission.enum';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import {
  ChangeAccountPasswordDto,
  ChangeLoginPasswordDto,
  UpdateCompanySettingsDto,
} from './dto/settings.dto';
import { CompanySetting } from './entities/company-setting.entity';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: 'Company settings' })
  get(): Promise<CompanySetting> {
    return this.settingsService.getCompanySettings();
  }

  @Patch()
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @ApiOperation({ summary: 'Update company settings' })
  update(
    @Body() dto: UpdateCompanySettingsDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<CompanySetting> {
    return this.settingsService.updateCompanySettings(dto, user, context);
  }

  @Post('change-login-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the login password' })
  async changeLoginPassword(
    @Body() dto: ChangeLoginPasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<{ message: string }> {
    await this.settingsService.changeLoginPassword(dto, user, context);
    return { message: 'Login password updated. Please sign in again.' };
  }

  @Post('change-account-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change the account password used to unlock financial information',
    description: 'Immediately invalidates every active financial unlock session.',
  })
  async changeAccountPassword(
    @Body() dto: ChangeAccountPasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<{ message: string }> {
    await this.settingsService.changeAccountPassword(dto, user, context);
    return { message: 'Account password updated.' };
  }
}
