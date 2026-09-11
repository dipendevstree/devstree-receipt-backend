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
exports.Payment = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/entities/base.entity");
const payment_enum_1 = require("../../../common/enums/payment.enum");
const client_entity_1 = require("../../clients/entities/client.entity");
const project_entity_1 = require("../../projects/entities/project.entity");
const receipt_entity_1 = require("../../receipts/entities/receipt.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let Payment = class Payment extends base_entity_1.SoftDeletableEntity {
    clientId;
    client;
    projectId;
    project;
    paymentDate;
    encryptedAmount;
    amountIv;
    amountAuthTag;
    encryptionKeyVersion;
    paymentMethod;
    transactionReference;
    bankAccount;
    notes;
    attachmentPath;
    status;
    voidReason;
    voidedAt;
    voidedBy;
    voidedByUser;
    createdBy;
    createdByUser;
    updatedBy;
    updatedByUser;
    receipt;
    countsTowardTotal() {
        return this.status === payment_enum_1.PaymentStatus.VALID && !this.deletedAt;
    }
};
exports.Payment = Payment;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ name: 'client_id', type: 'uuid' }),
    __metadata("design:type", String)
], Payment.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, (client) => client.payments, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], Payment.prototype, "client", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ name: 'project_id', type: 'uuid' }),
    __metadata("design:type", String)
], Payment.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, (project) => project.payments, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], Payment.prototype, "project", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, typeorm_1.Column)({ name: 'payment_date', type: 'date' }),
    __metadata("design:type", String)
], Payment.prototype, "paymentDate", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ name: 'encrypted_amount', type: 'text' }),
    __metadata("design:type", String)
], Payment.prototype, "encryptedAmount", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ name: 'amount_iv', type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], Payment.prototype, "amountIv", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ name: 'amount_auth_tag', type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], Payment.prototype, "amountAuthTag", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ name: 'encryption_key_version', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Payment.prototype, "encryptionKeyVersion", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: payment_enum_1.PaymentMethod }),
    (0, typeorm_1.Column)({ name: 'payment_method', type: 'enum', enum: payment_enum_1.PaymentMethod }),
    __metadata("design:type", String)
], Payment.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'transaction_reference', type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "transactionReference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'bank_account', type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "bankAccount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'attachment_path', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "attachmentPath", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: payment_enum_1.PaymentStatus }),
    (0, typeorm_1.Column)({ type: 'enum', enum: payment_enum_1.PaymentStatus, default: payment_enum_1.PaymentStatus.VALID }),
    __metadata("design:type", String)
], Payment.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, typeorm_1.Column)({ name: 'void_reason', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "voidReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'voided_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "voidedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'voided_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "voidedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'voided_by' }),
    __metadata("design:type", Object)
], Payment.prototype, "voidedByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", Object)
], Payment.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'updated_by' }),
    __metadata("design:type", Object)
], Payment.prototype, "updatedByUser", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => receipt_entity_1.Receipt, (receipt) => receipt.payment),
    __metadata("design:type", Object)
], Payment.prototype, "receipt", void 0);
exports.Payment = Payment = __decorate([
    (0, typeorm_1.Entity)('payments'),
    (0, typeorm_1.Index)('idx_payments_project_id', ['projectId']),
    (0, typeorm_1.Index)('idx_payments_client_id', ['clientId']),
    (0, typeorm_1.Index)('idx_payments_payment_date', ['paymentDate']),
    (0, typeorm_1.Index)('idx_payments_status', ['status']),
    (0, typeorm_1.Index)('idx_payments_project_status', ['projectId', 'status'])
], Payment);
//# sourceMappingURL=payment.entity.js.map