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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const app_constants_1 = require("../../common/constants/app.constants");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const request_context_decorator_1 = require("../../common/decorators/request-context.decorator");
const financial_dto_1 = require("./dto/financial.dto");
const financial_unlock_service_1 = require("./services/financial-unlock.service");
let FinancialController = class FinancialController {
    unlockService;
    constructor(unlockService) {
        this.unlockService = unlockService;
    }
    async unlock(user, context, dto) {
        const result = await this.unlockService.unlock(user, dto.accountPassword, context);
        return {
            token: result.token,
            unlocked: true,
            expiresAt: result.expiresAt.toISOString(),
            expiresInSeconds: result.expiresInSeconds,
            unlockDurationMinutes: Math.round(result.expiresInSeconds / 60),
        };
    }
    async lock(user, context) {
        await this.unlockService.lock(user, context);
        return this.unlockService.status(user.id, null).then(serializeStatus);
    }
    async status(user, token) {
        return this.unlockService.status(user.id, token).then(serializeStatus);
    }
};
exports.FinancialController = FinancialController;
__decorate([
    (0, common_1.Post)('unlock'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 300_000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Unlock financial information',
        description: 'Verifies the account password and opens a short-lived unlock session. The returned token must be sent as the x-financial-token header. Neither the account password nor any encryption key is returned.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: financial_dto_1.UnlockFinancialResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, request_context_decorator_1.ReqContext)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, financial_dto_1.UnlockFinancialDto]),
    __metadata("design:returntype", Promise)
], FinancialController.prototype, "unlock", null);
__decorate([
    (0, common_1.Post)('lock'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Lock financial information immediately' }),
    (0, swagger_1.ApiOkResponse)({ type: financial_dto_1.FinancialStatusResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinancialController.prototype, "lock", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Current financial unlock state',
        description: 'Server-side truth. The frontend must never infer unlock state on its own.',
    }),
    (0, swagger_1.ApiOkResponse)({ type: financial_dto_1.FinancialStatusResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Headers)(app_constants_1.FINANCIAL_UNLOCK_HEADER)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FinancialController.prototype, "status", null);
exports.FinancialController = FinancialController = __decorate([
    (0, swagger_1.ApiTags)('Financial Security'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('financial'),
    __metadata("design:paramtypes", [financial_unlock_service_1.FinancialUnlockService])
], FinancialController);
function serializeStatus(status) {
    return {
        unlocked: status.unlocked,
        expiresAt: status.expiresAt ? status.expiresAt.toISOString() : null,
        expiresInSeconds: status.expiresInSeconds,
        unlockDurationMinutes: status.unlockDurationMinutes,
    };
}
//# sourceMappingURL=financial.controller.js.map