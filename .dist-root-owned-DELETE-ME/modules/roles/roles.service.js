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
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../common/constants/error-codes");
const app_exception_1 = require("../../common/exceptions/app.exception");
const role_entity_1 = require("./entities/role.entity");
let RolesService = class RolesService {
    roles;
    constructor(roles) {
        this.roles = roles;
    }
    async findAll() {
        return this.roles.find({ order: { displayName: 'ASC' } });
    }
    async getOrFail(id) {
        const role = await this.roles.findOne({ where: { id }, relations: { permissions: true } });
        if (!role) {
            throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.NOT_FOUND, 'Role not found.');
        }
        return role;
    }
    async findByName(name) {
        return this.roles.findOne({ where: { name }, relations: { permissions: true } });
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], RolesService);
//# sourceMappingURL=roles.service.js.map