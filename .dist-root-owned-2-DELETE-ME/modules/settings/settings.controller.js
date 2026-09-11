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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const request_context_decorator_1 = require("../../common/decorators/request-context.decorator");
const permission_enum_1 = require("../../common/enums/permission.enum");
const settings_dto_1 = require("./dto/settings.dto");
const settings_service_1 = require("./settings.service");
let SettingsController = class SettingsController {
    settingsService;
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    get() {
        return this.settingsService.getCompanySettings();
    }
    update(dto, user, context) {
        return this.settingsService.updateCompanySettings(dto, user, context);
    }
    async changeLoginPassword(dto, user, context) {
        await this.settingsService.changeLoginPassword(dto, user, context);
        return { message: 'Login password updated. Please sign in again.' };
    }
    async changeAccountPassword(dto, user, context) {
        await this.settingsService.changeAccountPassword(dto, user, context);
        return { message: 'Account password updated.' };
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.SETTINGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Company settings' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.SETTINGS_UPDATE),
    (0, swagger_1.ApiOperation)({ summary: 'Update company settings' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [settings_dto_1.UpdateCompanySettingsDto, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('change-login-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Change the login password' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [settings_dto_1.ChangeLoginPasswordDto, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "changeLoginPassword", null);
__decorate([
    (0, common_1.Post)('change-account-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Change the account password used to unlock financial information',
        description: 'Immediately invalidates every active financial unlock session.',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, request_context_decorator_1.ReqContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [settings_dto_1.ChangeAccountPasswordDto, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "changeAccountPassword", null);
exports.SettingsController = SettingsController = __decorate([
    (0, swagger_1.ApiTags)('Settings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('settings'),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map