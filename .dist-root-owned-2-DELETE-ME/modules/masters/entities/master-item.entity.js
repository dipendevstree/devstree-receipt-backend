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
exports.MasterItem = void 0;
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/entities/base.entity");
const master_type_enum_1 = require("../../../common/enums/master-type.enum");
const user_entity_1 = require("../../users/entities/user.entity");
let MasterItem = class MasterItem extends base_entity_1.SoftDeletableEntity {
    type;
    name;
    code;
    description;
    status;
    sortOrder;
    isSystem;
    metadata;
    createdBy;
    createdByUser;
    updatedBy;
    updatedByUser;
};
exports.MasterItem = MasterItem;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: master_type_enum_1.MasterType }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], MasterItem.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Bank Transfer' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], MasterItem.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'BANK_TRANSFER', description: 'Stable identifier used by other records' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], MasterItem.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], MasterItem.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: master_type_enum_1.MasterStatus }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 16, default: master_type_enum_1.MasterStatus.ACTIVE }),
    __metadata("design:type", String)
], MasterItem.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10 }),
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MasterItem.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ name: 'is_system', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], MasterItem.prototype, "isSystem", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Object }),
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], MasterItem.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, typeorm_1.Column)({ name: 'created_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MasterItem.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", Object)
], MasterItem.prototype, "createdByUser", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, typeorm_1.Column)({ name: 'updated_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MasterItem.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'updated_by' }),
    __metadata("design:type", Object)
], MasterItem.prototype, "updatedByUser", void 0);
exports.MasterItem = MasterItem = __decorate([
    (0, typeorm_1.Entity)('master_items'),
    (0, typeorm_1.Unique)('uq_master_items_type_code', ['type', 'code']),
    (0, typeorm_1.Index)('idx_master_items_type', ['type']),
    (0, typeorm_1.Index)('idx_master_items_type_status', ['type', 'status'])
], MasterItem);
//# sourceMappingURL=master-item.entity.js.map