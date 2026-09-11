"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuditLogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
exports.redactSensitive = redactSensitive;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_log_entity_1 = require("./entities/audit-log.entity");
const REDACTED_FIELDS = new Set([
    'amount',
    'projectamount',
    'paymentamount',
    'totalreceived',
    'dueamount',
    'receivedamount',
    'encryptedamount',
    'amountiv',
    'amountauthtag',
    'password',
    'passwordhash',
    'accountpassword',
    'accountpasswordhash',
    'currentpassword',
    'newpassword',
    'confirmpassword',
    'token',
    'accesstoken',
    'refreshtoken',
    'sessiontoken',
    'sessiontokenhash',
    'tokenhash',
    'encryptionkey',
]);
const REDACTED_MARKER = '[REDACTED]';
let AuditLogService = AuditLogService_1 = class AuditLogService {
    repository;
    logger = new common_1.Logger(AuditLogService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async record(entry, manager) {
        const log = this.build(entry);
        try {
            if (manager) {
                await manager.getRepository(audit_log_entity_1.AuditLog).insert(log);
            }
            else {
                await this.repository.insert(log);
            }
        }
        catch (error) {
            this.logger.error(`Failed to persist audit entry ${entry.action} for ${entry.module}/${entry.recordId ?? '-'}`, error instanceof Error ? error.stack : String(error));
            if (manager)
                throw error;
        }
    }
    build(entry) {
        return {
            userId: entry.actor?.id ?? null,
            userName: entry.actor?.name ?? null,
            action: entry.action,
            module: entry.module,
            recordId: entry.recordId ?? null,
            description: entry.description?.slice(0, 255) ?? null,
            oldValue: redactSensitive(entry.oldValue),
            newValue: redactSensitive(entry.newValue),
            ipAddress: entry.context?.ipAddress ?? null,
            userAgent: entry.context?.userAgent ?? null,
        };
    }
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = AuditLogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditLogService);
function redactSensitive(value, depth = 0) {
    if (value === null || value === undefined)
        return null;
    if (depth > 6)
        return REDACTED_MARKER;
    if (Array.isArray(value)) {
        return value.map((item) => redactSensitive(item, depth + 1));
    }
    if (typeof value === 'object' && !(value instanceof Date)) {
        const result = {};
        for (const [key, entryValue] of Object.entries(value)) {
            const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
            if (REDACTED_FIELDS.has(normalized)) {
                result[key] = REDACTED_MARKER;
                continue;
            }
            result[key] =
                typeof entryValue === 'object' && entryValue !== null
                    ? redactSensitive(entryValue, depth + 1)
                    : entryValue;
        }
        return result;
    }
    return value;
}
//# sourceMappingURL=audit-log.service.js.map