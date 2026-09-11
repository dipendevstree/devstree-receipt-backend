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
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const financial_unlock_decorator_1 = require("../../common/decorators/financial-unlock.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const request_context_decorator_1 = require("../../common/decorators/request-context.decorator");
const permission_enum_1 = require("../../common/enums/permission.enum");
const project_dto_1 = require("./dto/project.dto");
const projects_service_1 = require("./projects.service");
let ProjectsController = class ProjectsController {
    projectsService;
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    findAll(query, access) {
        return this.projectsService.findAll(query, access.unlocked);
    }
    lookupByClient(clientId) {
        return this.projectsService.lookupByClient(clientId);
    }
    findOne(id, access) {
        return this.projectsService.findOne(id, access.unlocked);
    }
    create(dto, user, context) {
        return this.projectsService.create(dto, user, context);
    }
    update(id, dto, user, context, access) {
        return this.projectsService.update(id, dto, user, context, access.unlocked);
    }
    async archive(id, user, context) {
        await this.projectsService.archive(id, user, context);
        return { message: 'Project archived.' };
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PROJECTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'List projects (financial totals masked unless unlocked)' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [project_dto_1.QueryProjectDto, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('by-client/:clientId'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PROJECTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Lightweight project list for a client — used by Receive Payment' }),
    __param(0, (0, common_1.Param)('clientId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "lookupByClient", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PROJECTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Project details with financial summary' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PROJECTS_CREATE),
    (0, swagger_1.ApiOperation)({ summary: 'Create a project (amount is encrypted before storage)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [project_dto_1.CreateProjectDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PROJECTS_UPDATE),
    (0, swagger_1.ApiOperation)({ summary: 'Update a project' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, request_context_decorator_1.ReqContext)()),
    __param(4, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, project_dto_1.UpdateProjectDto, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PROJECTS_DELETE),
    (0, swagger_1.ApiOperation)({ summary: 'Archive a project (blocked while it has recorded payments)' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "archive", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, swagger_1.ApiTags)('Projects'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('projects'),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map