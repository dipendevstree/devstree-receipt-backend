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
exports.FinancialUnlockSession = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let FinancialUnlockSession = class FinancialUnlockSession {
    id;
    userId;
    user;
    sessionTokenHash;
    authTokenId;
    unlockedAt;
    expiresAt;
    lockedAt;
    ipAddress;
    userAgent;
    createdAt;
    isActive(now = new Date()) {
        return !this.lockedAt && this.expiresAt > now;
    }
};
exports.FinancialUnlockSession = FinancialUnlockSession;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FinancialUnlockSession.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    __metadata("design:type", String)
], FinancialUnlockSession.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], FinancialUnlockSession.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_token_hash', type: 'varchar', length: 128 }),
    __metadata("design:type", String)
], FinancialUnlockSession.prototype, "sessionTokenHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auth_token_id', type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], FinancialUnlockSession.prototype, "authTokenId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unlocked_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FinancialUnlockSession.prototype, "unlockedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FinancialUnlockSession.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'locked_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], FinancialUnlockSession.prototype, "lockedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", Object)
], FinancialUnlockSession.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_agent', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], FinancialUnlockSession.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FinancialUnlockSession.prototype, "createdAt", void 0);
exports.FinancialUnlockSession = FinancialUnlockSession = __decorate([
    (0, typeorm_1.Entity)('financial_unlock_sessions'),
    (0, typeorm_1.Index)('idx_financial_sessions_user', ['userId']),
    (0, typeorm_1.Index)('idx_financial_sessions_token_hash', ['sessionTokenHash'], { unique: true }),
    (0, typeorm_1.Index)('idx_financial_sessions_expires', ['expiresAt'])
], FinancialUnlockSession);
//# sourceMappingURL=financial-unlock-session.entity.js.map