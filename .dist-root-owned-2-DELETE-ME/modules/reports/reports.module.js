"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const client_entity_1 = require("../clients/entities/client.entity");
const payment_entity_1 = require("../payments/entities/payment.entity");
const project_entity_1 = require("../projects/entities/project.entity");
const reports_controller_1 = require("./reports.controller");
const reports_service_1 = require("./reports.service");
const report_export_service_1 = require("./services/report-export.service");
let ReportsModule = class ReportsModule {
};
exports.ReportsModule = ReportsModule;
exports.ReportsModule = ReportsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([client_entity_1.Client, project_entity_1.Project, payment_entity_1.Payment])],
        controllers: [reports_controller_1.ReportsController],
        providers: [reports_service_1.ReportsService, report_export_service_1.ReportExportService],
    })
], ReportsModule);
//# sourceMappingURL=reports.module.js.map