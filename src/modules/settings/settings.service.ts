import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { COMPANY_SETTINGS_SINGLETON_KEY } from 'src/common/constants/app.constants';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import { ProfileService } from 'src/modules/profile/profile.service';
import {
  ChangeAccountPasswordDto,
  ChangeLoginPasswordDto,
  UpdateCompanySettingsDto,
} from './dto/settings.dto';
import { CompanySetting } from './entities/company-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(CompanySetting) private readonly settings: Repository<CompanySetting>,
    private readonly profileService: ProfileService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getCompanySettings(): Promise<CompanySetting> {
    let settings = await this.settings.findOne({ where: { key: COMPANY_SETTINGS_SINGLETON_KEY } });
    if (!settings) {
      settings = this.settings.create({ key: COMPANY_SETTINGS_SINGLETON_KEY });
      settings = await this.settings.save(settings);
    }
    return settings;
  }

  async updateCompanySettings(
    dto: UpdateCompanySettingsDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<CompanySetting> {
    const settings = await this.getCompanySettings();
    const before = { ...settings };

    Object.assign(settings, dto as Partial<CompanySetting>, { updatedBy: actor.id });
    const saved = await this.settings.save(settings);

    await this.auditLog.record({
      action: AuditAction.SETTINGS_UPDATED,
      module: AuditModule.SETTINGS,
      recordId: COMPANY_SETTINGS_SINGLETON_KEY,
      description: 'Updated company settings',
      oldValue: before,
      newValue: { ...dto },
      actor,
      context,
    });

    return saved;
  }

  /**
   * Retained for the existing Settings screens. The implementation now lives in
   * ProfileService, which owns self-service credential changes for the signed-in
   * administrator — these two endpoints and the Profile screens must never
   * diverge in what they verify or revoke.
   *
   * "Login password" here is the same credential the Profile screen calls the
   * Account Password: it is what you sign in with.
   */
  async changeLoginPassword(
    dto: ChangeLoginPasswordDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    await this.profileService.updateAccountPassword(
      {
        currentPassword: dto.currentPassword,
        newPassword: dto.newPassword,
        confirmPassword: dto.confirmPassword,
      },
      actor,
      context,
    );
  }

  /**
   * "Account password" here is the financial-unlock credential — what the
   * Profile screen calls the Finance Password. Changing it invalidates every
   * active financial unlock session and leaves the login session alone.
   */
  async changeAccountPassword(
    dto: ChangeAccountPasswordDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    await this.profileService.updateFinancePassword(
      {
        currentFinancePassword: dto.currentAccountPassword,
        newFinancePassword: dto.newAccountPassword,
        confirmFinancePassword: dto.confirmAccountPassword,
      },
      actor,
      context,
    );
  }
}
