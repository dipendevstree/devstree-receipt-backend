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
exports.CompanySetting = void 0;
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
let CompanySetting = class CompanySetting {
    key;
    companyName;
    logoPath;
    email;
    phone;
    website;
    address;
    city;
    state;
    postalCode;
    country;
    taxNumber;
    currency;
    currencySymbol;
    currencyPrecision;
    dateFormat;
    receiptFooterNote;
    authorizedSignatory;
    updatedAt;
    updatedBy;
};
exports.CompanySetting = CompanySetting;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], CompanySetting.prototype, "key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ name: 'company_name', type: 'varchar', length: 160, default: 'Devstree' }),
    __metadata("design:type", String)
], CompanySetting.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'logo_path', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "logoPath", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 180, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 24, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 180, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "website", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'postal_code', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'tax_number', type: 'varchar', length: 40, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "taxNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'INR' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 8, default: 'INR' }),
    __metadata("design:type", String)
], CompanySetting.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '₹' }),
    (0, typeorm_1.Column)({ name: 'currency_symbol', type: 'varchar', length: 8, default: '₹' }),
    __metadata("design:type", String)
], CompanySetting.prototype, "currencySymbol", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2 }),
    (0, typeorm_1.Column)({ name: 'currency_precision', type: 'int', default: 2 }),
    __metadata("design:type", Number)
], CompanySetting.prototype, "currencyPrecision", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'dd MMM yyyy' }),
    (0, typeorm_1.Column)({ name: 'date_format', type: 'varchar', length: 32, default: 'dd MMM yyyy' }),
    __metadata("design:type", String)
], CompanySetting.prototype, "dateFormat", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'receipt_footer_note', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "receiptFooterNote", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'authorized_signatory', type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "authorizedSignatory", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CompanySetting.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], CompanySetting.prototype, "updatedBy", void 0);
exports.CompanySetting = CompanySetting = __decorate([
    (0, typeorm_1.Entity)('company_settings')
], CompanySetting);
//# sourceMappingURL=company-setting.entity.js.map