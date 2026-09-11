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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialUnlockAttempt = void 0;
const typeorm_1 = require("typeorm");
let FinancialUnlockAttempt = class FinancialUnlockAttempt {
    id;
    userId;
    successful;
    ipAddress;
    createdAt;
};
exports.FinancialUnlockAttempt = FinancialUnlockAttempt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FinancialUnlockAttempt.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    __metadata("design:type", String)
], FinancialUnlockAttempt.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], FinancialUnlockAttempt.prototype, "successful", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", Object)
], FinancialUnlockAttempt.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FinancialUnlockAttempt.prototype, "createdAt", void 0);
exports.FinancialUnlockAttempt = FinancialUnlockAttempt = __decorate([
    (0, typeorm_1.Entity)('financial_unlock_attempts'),
    (0, typeorm_1.Index)('idx_financial_attempts_user_created', ['userId', 'createdAt'])
], FinancialUnlockAttempt);
//# sourceMappingURL=financial-unlock-attempt.entity.js.map