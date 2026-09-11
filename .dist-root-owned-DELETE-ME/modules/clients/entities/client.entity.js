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
exports.Client = void 0;
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/entities/base.entity");
const client_status_enum_1 = require("../../../common/enums/client-status.enum");
const payment_entity_1 = require("../../payments/entities/payment.entity");
const project_entity_1 = require("../../projects/entities/project.entity");
let Client = class Client extends base_entity_1.SoftDeletableEntity {
    clientCode;
    name;
    companyName;
    email;
    phone;
    alternatePhone;
    country;
    address;
    city;
    state;
    postalCode;
    taxNumber;
    notes;
    status;
    projects;
    payments;
};
exports.Client = Client;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CLI-0001' }),
    (0, typeorm_1.Column)({ name: 'client_code', type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], Client.prototype, "clientCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 160 }),
    __metadata("design:type", String)
], Client.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'company_name', type: 'varchar', length: 160, nullable: true }),
    __metadata("design:type", Object)
], Client.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 180, nullable: true }),
    __metadata("design:type", Object)
], Client.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 24, nullable: true }),
    __metadata("design:type", Object)
], Client.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'alternate_phone', type: 'varchar', length: 24, nullable: true }),
    __metadata("design:type", Object)
], Client.prototype, "alternatePhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], Client.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Client.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], Client.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], Client.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'postal_code', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], Client.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'GST / VAT / Tax registration number' }),
    (0, typeorm_1.Column)({ name: 'tax_number', type: 'varchar', length: 40, nullable: true }),
    __metadata("design:type", Object)
], Client.prototype, "taxNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Client.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_status_enum_1.ClientStatus }),
    (0, typeorm_1.Column)({ type: 'enum', enum: client_status_enum_1.ClientStatus, default: client_status_enum_1.ClientStatus.ACTIVE }),
    __metadata("design:type", String)
], Client.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => project_entity_1.Project, (project) => project.client),
    __metadata("design:type", Array)
], Client.prototype, "projects", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payment_entity_1.Payment, (payment) => payment.client),
    __metadata("design:type", Array)
], Client.prototype, "payments", void 0);
exports.Client = Client = __decorate([
    (0, typeorm_1.Entity)('clients'),
    (0, typeorm_1.Index)('idx_clients_client_code', ['clientCode'], { unique: true }),
    (0, typeorm_1.Index)('idx_clients_email', ['email']),
    (0, typeorm_1.Index)('idx_clients_name', ['name']),
    (0, typeorm_1.Index)('idx_clients_status', ['status'])
], Client);
//# sourceMappingURL=client.entity.js.map