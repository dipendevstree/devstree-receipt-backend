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
exports.FinancialUnlockGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const financial_unlock_service_1 = require("../../modules/financial/services/financial-unlock.service");
const app_constants_1 = require("../constants/app.constants");
const error_codes_1 = require("../constants/error-codes");
const financial_unlock_decorator_1 = require("../decorators/financial-unlock.decorator");
const public_decorator_1 = require("../decorators/public.decorator");
const app_exception_1 = require("../exceptions/app.exception");
let FinancialUnlockGuard = class FinancialUnlockGuard {
    reflector;
    unlockService;
    constructor(reflector, unlockService) {
        this.reflector = reflector;
        this.unlockService = unlockService;
    }
    async canActivate(context) {
        if (context.getType() !== 'http')
            return true;
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        request.financialAccess = { unlocked: false };
        const required = this.reflector.getAllAndOverride(financial_unlock_decorator_1.FINANCIAL_UNLOCK_REQUIRED_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (user) {
            const header = request.headers[app_constants_1.FINANCIAL_UNLOCK_HEADER];
            const token = Array.isArray(header) ? header[0] : header;
            const session = await this.unlockService.resolveSession(user.id, token);
            if (session) {
                request.financialAccess = {
                    unlocked: true,
                    sessionId: session.id,
                    expiresAt: session.expiresAt,
                };
            }
        }
        if (required && !request.financialAccess.unlocked) {
            throw app_exception_1.AppException.forbidden(error_codes_1.ErrorCode.FINANCIAL_LOCKED, 'Financial information is locked. Please unlock financial information to continue.');
        }
        return true;
    }
};
exports.FinancialUnlockGuard = FinancialUnlockGuard;
exports.FinancialUnlockGuard = FinancialUnlockGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        financial_unlock_service_1.FinancialUnlockService])
], FinancialUnlockGuard);
//# sourceMappingURL=financial-unlock.guard.js.map