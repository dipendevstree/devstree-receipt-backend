"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const audit_logs_module_1 = require("../audit-logs/audit-logs.module");
const payment_entity_1 = require("../payments/entities/payment.entity");
const project_entity_1 = require("../projects/entities/project.entity");
const user_entity_1 = require("../users/entities/user.entity");
const financial_controller_1 = require("./financial.controller");
const financial_unlock_attempt_entity_1 = require("./entities/financial-unlock-attempt.entity");
const financial_unlock_session_entity_1 = require("./entities/financial-unlock-session.entity");
const key_provider_interface_1 = require("./interfaces/key-provider.interface");
const env_key_provider_1 = require("./providers/env-key.provider");
const financial_encryption_service_1 = require("./services/financial-encryption.service");
const financial_unlock_service_1 = require("./services/financial-unlock.service");
const project_financials_service_1 = require("./services/project-financials.service");
let FinancialModule = class FinancialModule {
};
exports.FinancialModule = FinancialModule;
exports.FinancialModule = FinancialModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                financial_unlock_session_entity_1.FinancialUnlockSession,
                financial_unlock_attempt_entity_1.FinancialUnlockAttempt,
                user_entity_1.User,
                project_entity_1.Project,
                payment_entity_1.Payment,
            ]),
            audit_logs_module_1.AuditLogsModule,
        ],
        controllers: [financial_controller_1.FinancialController],
        providers: [
            env_key_provider_1.EnvFinancialKeyProvider,
            { provide: key_provider_interface_1.FINANCIAL_KEY_PROVIDER, useExisting: env_key_provider_1.EnvFinancialKeyProvider },
            financial_encryption_service_1.FinancialEncryptionService,
            financial_unlock_service_1.FinancialUnlockService,
            project_financials_service_1.ProjectFinancialsService,
        ],
        exports: [financial_encryption_service_1.FinancialEncryptionService, financial_unlock_service_1.FinancialUnlockService, project_financials_service_1.ProjectFinancialsService],
    })
], FinancialModule);
//# sourceMappingURL=financial.module.js.map