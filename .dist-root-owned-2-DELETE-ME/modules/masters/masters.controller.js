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
exports.MastersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const error_codes_1 = require("../../common/constants/error-codes");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const request_context_decorator_1 = require("../../common/decorators/request-context.decorator");
const master_type_enum_1 = require("../../common/enums/master-type.enum");
const permission_enum_1 = require("../../common/enums/permission.enum");
const app_exception_1 = require("../../common/exceptions/app.exception");
const master_dto_1 = require("./dto/master.dto");
const masters_service_1 = require("./masters.service");
const TYPE_PARAM = {
    name: 'type',
    enum: Object.keys(master_type_enum_1.MASTER_TYPE_BY_SLUG),
    description: 'Master collection slug',
};
let MastersController = class MastersController {
    mastersService;
    constructor(mastersService) {
        this.mastersService = mastersService;
    }
    listTypes() {
        return Object.entries(master_type_enum_1.MASTER_TYPE_BY_SLUG).map(([slug, type]) => ({
            slug,
            type,
            label: master_type_enum_1.MASTER_TYPE_LABELS[type],
        }));
    }
    findAll(type, query) {
        return this.mastersService.findAll(resolveType(type), query);
    }
    options(type) {
        return this.mastersService.options(resolveType(type));
    }
    create(type, dto, user, context) {
        return this.mastersService.create(resolveType(type), dto, user, context);
    }
    findOne(id) {
        return this.mastersService.findOne(id);
    }
    update(id, dto, user, context) {
        return this.mastersService.update(id, dto, user, context);
    }
    async remove(id, user, context) {
        await this.mastersService.remove(id, user, context);
        return { message: 'Master record deleted.' };
    }
};
exports.MastersController = MastersController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.MASTERS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List the available master collections' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Array)
], MastersController.prototype, "listTypes", null);
__decorate([
    (0, common_1.Get)(':type'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.MASTERS_VIEW),
    (0, swagger_1.ApiParam)(TYPE_PARAM),
    (0, swagger_1.ApiOperation)({ summary: 'List records in a master collection' }),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, master_dto_1.QueryMasterItemDto]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':type/options'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.MASTERS_VIEW),
    (0, swagger_1.ApiParam)(TYPE_PARAM),
    (0, swagger_1.ApiOperation)({
        summary: 'Active records only, for populating dropdowns',
        description: 'The frontend must source every dropdown from here rather than hardcoding values.',
    }),
    __param(0, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "options", null);
__decorate([
    (0, common_1.Post)(':type'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.MASTERS_CREATE),
    (0, swagger_1.ApiParam)(TYPE_PARAM),
    (0, swagger_1.ApiOperation)({ summary: 'Create a master record' }),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, master_dto_1.CreateMasterItemDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('record/:id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.MASTERS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single master record' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('record/:id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.MASTERS_UPDATE),
    (0, swagger_1.ApiOperation)({ summary: 'Update a master record' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, master_dto_1.UpdateMasterItemDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('record/:id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.MASTERS_DELETE),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a master record (system records must be deactivated instead)' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "remove", null);
exports.MastersController = MastersController = __decorate([
    (0, swagger_1.ApiTags)('Masters'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('masters'),
    __metadata("design:paramtypes", [masters_service_1.MastersService])
], MastersController);
function resolveType(slug) {
    const type = master_type_enum_1.MASTER_TYPE_BY_SLUG[slug];
    if (!type) {
        throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.NOT_FOUND, `Unknown master collection "${slug}". Valid collections: ${Object.keys(master_type_enum_1.MASTER_TYPE_BY_SLUG).join(', ')}.`);
    }
    return type;
}
//# sourceMappingURL=masters.controller.js.map