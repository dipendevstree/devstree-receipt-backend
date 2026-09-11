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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const financial_unlock_decorator_1 = require("../../common/decorators/financial-unlock.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const request_context_decorator_1 = require("../../common/decorators/request-context.decorator");
const permission_enum_1 = require("../../common/enums/permission.enum");
const payment_dto_1 = require("./dto/payment.dto");
const payments_service_1 = require("./payments.service");
let PaymentsController = class PaymentsController {
    paymentsService;
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    findAll(query, access) {
        return this.paymentsService.findAll(query, access.unlocked);
    }
    findOne(id, access) {
        return this.paymentsService.findOne(id, access.unlocked);
    }
    create(dto, user, context) {
        return this.paymentsService.create(dto, user, context);
    }
    update(id, dto, user, context, access) {
        return this.paymentsService.update(id, dto, user, context, access.unlocked);
    }
    async void(id, dto, user, context) {
        await this.paymentsService.void(id, dto, user, context);
        return { message: 'Payment voided.' };
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PAYMENTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List payments (amounts masked unless unlocked)' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.QueryPaymentDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PAYMENTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Payment details' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PAYMENTS_CREATE),
    (0, swagger_1.ApiOperation)({
        summary: 'Receive a payment',
        description: 'Validates the amount against the remaining due, encrypts it, and atomically generates a receipt. The project row is locked for the transaction so concurrent payments cannot overshoot the project amount.',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.CreatePaymentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PAYMENTS_UPDATE),
    (0, swagger_1.ApiOperation)({
        summary: 'Update non-financial payment details (amount is immutable — void and re-enter instead)',
    }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, request_context_decorator_1.ReqContext)()),
    __param(4, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, payment_dto_1.UpdatePaymentDto, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/void'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PAYMENTS_VOID),
    (0, swagger_1.ApiOperation)({ summary: 'Void a payment — excluded from totals but kept for audit history' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, payment_dto_1.VoidPaymentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "void", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map