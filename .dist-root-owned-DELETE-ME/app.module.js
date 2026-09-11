"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const typeorm_1 = require("@nestjs/typeorm");
const path_1 = require("path");
const common_module_1 = require("./common/common.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const financial_unlock_guard_1 = require("./common/guards/financial-unlock.guard");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const permissions_guard_1 = require("./common/guards/permissions.guard");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const configuration_1 = __importDefault(require("./config/configuration"));
const env_validation_1 = require("./config/env.validation");
const health_controller_1 = require("./health.controller");
const audit_logs_module_1 = require("./modules/audit-logs/audit-logs.module");
const auth_module_1 = require("./modules/auth/auth.module");
const clients_module_1 = require("./modules/clients/clients.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const financial_module_1 = require("./modules/financial/financial.module");
const payments_module_1 = require("./modules/payments/payments.module");
const projects_module_1 = require("./modules/projects/projects.module");
const receipts_module_1 = require("./modules/receipts/receipts.module");
const reports_module_1 = require("./modules/reports/reports.module");
const roles_module_1 = require("./modules/roles/roles.module");
const settings_module_1 = require("./modules/settings/settings.module");
const users_module_1 = require("./modules/users/users.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                cache: true,
                load: [configuration_1.default],
                validate: env_validation_1.validateEnv,
                envFilePath: [(0, path_1.join)(__dirname, '..', '..', '.env'), '.env'],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.getOrThrow('database.host'),
                    port: config.getOrThrow('database.port'),
                    database: config.getOrThrow('database.name'),
                    username: config.getOrThrow('database.user'),
                    password: config.getOrThrow('database.password'),
                    ssl: config.get('database.ssl') ? { rejectUnauthorized: false } : false,
                    autoLoadEntities: true,
                    synchronize: false,
                    migrationsRun: false,
                    logging: config.get('database.logging') ? ['query', 'error'] : ['error'],
                    retryAttempts: 10,
                    retryDelay: 3000,
                }),
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => [
                    {
                        name: 'default',
                        ttl: config.get('throttle.ttl', 60) * 1000,
                        limit: config.get('throttle.limit', 100),
                    },
                ],
            }),
            common_module_1.CommonModule,
            audit_logs_module_1.AuditLogsModule,
            financial_module_1.FinancialModule,
            auth_module_1.AuthModule,
            roles_module_1.RolesModule,
            users_module_1.UsersModule,
            clients_module_1.ClientsModule,
            projects_module_1.ProjectsModule,
            payments_module_1.PaymentsModule,
            receipts_module_1.ReceiptsModule,
            reports_module_1.ReportsModule,
            dashboard_module_1.DashboardModule,
            settings_module_1.SettingsModule,
        ],
        controllers: [health_controller_1.HealthController],
        providers: [
            { provide: core_1.APP_FILTER, useClass: all_exceptions_filter_1.AllExceptionsFilter },
            { provide: core_1.APP_INTERCEPTOR, useClass: transform_interceptor_1.TransformInterceptor },
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: permissions_guard_1.PermissionsGuard },
            { provide: core_1.APP_GUARD, useClass: financial_unlock_guard_1.FinancialUnlockGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map