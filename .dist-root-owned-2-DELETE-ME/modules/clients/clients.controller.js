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
exports.ClientsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const financial_unlock_decorator_1 = require("../../common/decorators/financial-unlock.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const request_context_decorator_1 = require("../../common/decorators/request-context.decorator");
const permission_enum_1 = require("../../common/enums/permission.enum");
const clients_service_1 = require("./clients.service");
const client_dto_1 = require("./dto/client.dto");
let ClientsController = class ClientsController {
    clientsService;
    constructor(clientsService) {
        this.clientsService = clientsService;
    }
    findAll(query, access) {
        return this.clientsService.findAll(query, access.unlocked);
    }
    lookup(query) {
        return this.clientsService.lookup(query);
    }
    findOne(id, access) {
        return this.clientsService.findOne(id, access.unlocked);
    }
    create(dto, user, context) {
        return this.clientsService.create(dto, user, context);
    }
    update(id, dto, user, context, access) {
        return this.clientsService.update(id, dto, user, context, access.unlocked);
    }
    async archive(id, user, context) {
        await this.clientsService.archive(id, user, context);
        return { message: 'Client archived.' };
    }
};
exports.ClientsController = ClientsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.CLIENTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List clients (financial totals masked unless unlocked)' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [client_dto_1.QueryClientDto, Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('lookup'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.CLIENTS_VIEW),
    (0, swagger_1.ApiOperation)({
        summary: 'Searchable client list for select inputs — no financial data',
        description: 'Backs every client dropdown in the UI. Search runs in Postgres and the result is capped, so large client tables never reach the browser.',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [client_dto_1.ClientLookupQueryDto]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "lookup", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.CLIENTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Client details with financial summary' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.CLIENTS_CREATE),
    (0, swagger_1.ApiOperation)({ summary: 'Create a client' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [client_dto_1.CreateClientDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.CLIENTS_UPDATE),
    (0, swagger_1.ApiOperation)({ summary: 'Update a client' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, request_context_decorator_1.ReqContext)()),
    __param(4, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_dto_1.UpdateClientDto, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.CLIENTS_DELETE),
    (0, swagger_1.ApiOperation)({ summary: 'Archive a client (soft delete; blocked while it has active projects)' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "archive", null);
exports.ClientsController = ClientsController = __decorate([
    (0, swagger_1.ApiTags)('Clients'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('clients'),
    __metadata("design:paramtypes", [clients_service_1.ClientsService])
], ClientsController);
//# sourceMappingURL=clients.controller.js.map