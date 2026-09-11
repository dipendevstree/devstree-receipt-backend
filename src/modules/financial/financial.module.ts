import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from 'src/modules/audit-logs/audit-logs.module';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { FinancialController } from './financial.controller';
import { FinancialUnlockAttempt } from './entities/financial-unlock-attempt.entity';
import { FinancialUnlockSession } from './entities/financial-unlock-session.entity';
import { FINANCIAL_KEY_PROVIDER } from './interfaces/key-provider.interface';
import { EnvFinancialKeyProvider } from './providers/env-key.provider';
import { FinancialEncryptionService } from './services/financial-encryption.service';
import { FinancialUnlockService } from './services/financial-unlock.service';
import { ProjectFinancialsService } from './services/project-financials.service';

/**
 * Global because the unlock guard and every money-touching module depend on it.
 * Swap FINANCIAL_KEY_PROVIDER here to move key custody to KMS/Vault.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialUnlockSession,
      FinancialUnlockAttempt,
      User,
      Project,
      Payment,
    ]),
    AuditLogsModule,
  ],
  controllers: [FinancialController],
  providers: [
    EnvFinancialKeyProvider,
    { provide: FINANCIAL_KEY_PROVIDER, useExisting: EnvFinancialKeyProvider },
    FinancialEncryptionService,
    FinancialUnlockService,
    ProjectFinancialsService,
  ],
  exports: [FinancialEncryptionService, FinancialUnlockService, ProjectFinancialsService],
})
export class FinancialModule {}
