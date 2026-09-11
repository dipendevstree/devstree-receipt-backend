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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/entities/base.entity");
const project_status_enum_1 = require("../../../common/enums/project-status.enum");
const client_entity_1 = require("../../clients/entities/client.entity");
const payment_entity_1 = require("../../payments/entities/payment.entity");
let Project = class Project extends base_entity_1.SoftDeletableEntity {
    clientId;
    client;
    projectCode;
    projectName;
    description;
    encryptedAmount;
    amountIv;
    amountAuthTag;
    encryptionKeyVersion;
    startDate;
    expectedEndDate;
    status;
    notes;
    createdBy;
    updatedBy;
    payments;
    hasProjectAmount() {
        return (this.encryptedAmount !== null &&
            this.encryptedAmount !== undefined &&
            this.amountIv !== null &&
            this.amountAuthTag !== null &&
            this.encryptionKeyVersion !== null);
    }
};
exports.Project = Project;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ name: 'client_id', type: 'uuid' }),
    __metadata("design:type", String)
], Project.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, (client) => client.projects, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], Project.prototype, "client", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PRJ-0001' }),
    (0, typeorm_1.Column)({ name: 'project_code', type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], Project.prototype, "projectCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ name: 'project_name', type: 'varchar', length: 180 }),
    __metadata("design:type", String)
], Project.prototype, "projectName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "description", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ name: 'encrypted_amount', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "encryptedAmount", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ name: 'amount_iv', type: 'varchar', length: 32, nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "amountIv", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ name: 'amount_auth_tag', type: 'varchar', length: 32, nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "amountAuthTag", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ name: 'encryption_key_version', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "encryptionKeyVersion", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'start_date', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'expected_end_date', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "expectedEndDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: project_status_enum_1.ProjectStatus }),
    (0, typeorm_1.Column)({ type: 'enum', enum: project_status_enum_1.ProjectStatus, default: project_status_enum_1.ProjectStatus.DRAFT }),
    __metadata("design:type", String)
], Project.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Project.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payment_entity_1.Payment, (payment) => payment.project),
    __metadata("design:type", Array)
], Project.prototype, "payments", void 0);
exports.Project = Project = __decorate([
    (0, typeorm_1.Entity)('projects'),
    (0, typeorm_1.Index)('idx_projects_client_id', ['clientId']),
    (0, typeorm_1.Index)('idx_projects_project_code', ['projectCode'], { unique: true }),
    (0, typeorm_1.Index)('idx_projects_status', ['status']),
    (0, typeorm_1.Index)('idx_projects_name', ['projectName'])
], Project);
//# sourceMappingURL=project.entity.js.map