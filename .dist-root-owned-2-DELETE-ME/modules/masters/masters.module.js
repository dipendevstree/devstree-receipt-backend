"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const audit_logs_module_1 = require("../audit-logs/audit-logs.module");
const master_item_entity_1 = require("./entities/master-item.entity");
const masters_controller_1 = require("./masters.controller");
const masters_service_1 = require("./masters.service");
let MastersModule = class MastersModule {
};
exports.MastersModule = MastersModule;
exports.MastersModule = MastersModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([master_item_entity_1.MasterItem]), audit_logs_module_1.AuditLogsModule],
        controllers: [masters_controller_1.MastersController],
        providers: [masters_service_1.MastersService],
        exports: [masters_service_1.MastersService],
    })
], MastersModule);
//# sourceMappingURL=masters.module.js.map