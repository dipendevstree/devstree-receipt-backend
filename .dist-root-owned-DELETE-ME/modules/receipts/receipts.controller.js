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
exports.ReceiptsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const financial_unlock_decorator_1 = require("../../common/decorators/financial-unlock.decorator");
const financial_unlock_decorator_2 = require("../../common/decorators/financial-unlock.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const raw_response_decorator_1 = require("../../common/decorators/raw-response.decorator");
const request_context_decorator_1 = require("../../common/decorators/request-context.decorator");
const permission_enum_1 = require("../../common/enums/permission.enum");
const receipt_dto_1 = require("./dto/receipt.dto");
const receipts_service_1 = require("./receipts.service");
let ReceiptsController = class ReceiptsController {
    receiptsService;
    constructor(receiptsService) {
        this.receiptsService = receiptsService;
    }
    findAll(query, access) {
        return this.receiptsService.findAll(query, access.unlocked);
    }
    findOne(id, access) {
        return this.receiptsService.findOne(id, access.unlocked);
    }
    async downloadPdf(id, user, context, res) {
        const { stream, filename } = await this.receiptsService.renderPdf(id, user, context);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        stream.pipe(res);
    }
    async printPdf(id, user, context, res) {
        const { stream, filename } = await this.receiptsService.renderPdf(id, user, context);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        stream.pipe(res);
    }
};
exports.ReceiptsController = ReceiptsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.RECEIPTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List receipts' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, financial_unlock_decorator_2.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [receipt_dto_1.QueryReceiptDto, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.RECEIPTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Receipt details' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, financial_unlock_decorator_2.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/pdf'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.RECEIPTS_PRINT),
    (0, financial_unlock_decorator_1.RequireFinancialUnlock)(),
    (0, raw_response_decorator_1.RawResponse)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Download the receipt as a printable A4 PDF (requires financial unlock)',
    }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, request_context_decorator_1.ReqContext)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "downloadPdf", null);
__decorate([
    (0, common_1.Get)(':id/print'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.RECEIPTS_PRINT),
    (0, financial_unlock_decorator_1.RequireFinancialUnlock)(),
    (0, raw_response_decorator_1.RawResponse)(),
    (0, swagger_1.ApiOperation)({ summary: 'Same as /pdf but forces a download (used by the Print button)' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, request_context_decorator_1.ReqContext)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "printPdf", null);
exports.ReceiptsController = ReceiptsController = __decorate([
    (0, swagger_1.ApiTags)('Receipts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('receipts'),
    __metadata("design:paramtypes", [receipts_service_1.ReceiptsService])
], ReceiptsController);
//# sourceMappingURL=receipts.controller.js.map