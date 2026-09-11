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
exports.Receipt = void 0;
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/entities/base.entity");
const master_type_enum_1 = require("../../../common/enums/master-type.enum");
const payment_entity_1 = require("../../payments/entities/payment.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let Receipt = class Receipt extends base_entity_1.BaseEntity {
    paymentId;
    payment;
    receiptNumber;
    receiptDate;
    status;
    generatedBy;
    generatedByUser;
    pdfPath;
};
exports.Receipt = Receipt;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ name: 'payment_id', type: 'uuid' }),
    __metadata("design:type", String)
], Receipt.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => payment_entity_1.Payment, (payment) => payment.receipt, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'payment_id' }),
    __metadata("design:type", payment_entity_1.Payment)
], Receipt.prototype, "payment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'REC-000001' }),
    (0, typeorm_1.Column)({ name: 'receipt_number', type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], Receipt.prototype, "receiptNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ name: 'receipt_date', type: 'date' }),
    __metadata("design:type", String)
], Receipt.prototype, "receiptDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: master_type_enum_1.ReceiptStatus }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 16, default: master_type_enum_1.ReceiptStatus.GENERATED }),
    __metadata("design:type", String)
], Receipt.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'generated_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Receipt.prototype, "generatedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'generated_by' }),
    __metadata("design:type", Object)
], Receipt.prototype, "generatedByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pdf_path', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Receipt.prototype, "pdfPath", void 0);
exports.Receipt = Receipt = __decorate([
    (0, typeorm_1.Entity)('receipts'),
    (0, typeorm_1.Index)('idx_receipts_receipt_number', ['receiptNumber'], { unique: true }),
    (0, typeorm_1.Index)('idx_receipts_payment_id', ['paymentId'], { unique: true }),
    (0, typeorm_1.Index)('idx_receipts_receipt_date', ['receiptDate'])
], Receipt);
//# sourceMappingURL=receipt.entity.js.map