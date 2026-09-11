import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { CommonModule } from './common/common.module';
import { ExcelModule } from './common/excel/excel.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { FinancialUnlockGuard } from './common/guards/financial-unlock.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health.controller';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FinancialModule } from './modules/financial/financial.module';
import { ImportsModule } from './modules/imports/imports.module';
import { MastersModule } from './modules/masters/masters.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProfileModule } from './modules/profile/profile.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RolesModule } from './modules/roles/roles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      // Startup aborts on a missing/weak encryption key or JWT secret.
      validate: validateEnv,
      envFilePath: [join(__dirname, '..', '..', '.env'), '.env'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.getOrThrow<string>('database.host'),
        port: config.getOrThrow<number>('database.port'),
        database: config.getOrThrow<string>('database.name'),
        username: config.getOrThrow<string>('database.user'),
        password: config.getOrThrow<string>('database.password'),
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        // Schema changes only ever arrive through migrations.
        synchronize: false,
        migrationsRun: false,
        logging: config.get<boolean>('database.logging') ? ['query', 'error'] : ['error'],
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('throttle.ttl', 60) * 1000,
          limit: config.get<number>('throttle.limit', 100),
        },
      ],
    }),

    CommonModule,
    ExcelModule,
    AuditLogsModule,
    FinancialModule,
    AuthModule,
    RolesModule,
    UsersModule,
    ProfileModule,
    MastersModule,
    ImportsModule,
    ClientsModule,
    ProjectsModule,
    PaymentsModule,
    ReceiptsModule,
    ReportsModule,
    DashboardModule,
    SettingsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Guard order is significant: authenticate, then authorise, then resolve
    // the financial unlock grant that decides whether amounts may be returned.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: FinancialUnlockGuard },
  ],
})
export class AppModule {}
