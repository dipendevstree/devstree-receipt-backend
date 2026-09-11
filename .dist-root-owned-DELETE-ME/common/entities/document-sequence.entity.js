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
exports.SequenceKey = exports.DocumentSequence = void 0;
const typeorm_1 = require("typeorm");
let DocumentSequence = class DocumentSequence {
    key;
    currentValue;
    prefix;
    padding;
    updatedAt;
};
exports.DocumentSequence = DocumentSequence;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 48 }),
    __metadata("design:type", String)
], DocumentSequence.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_value', type: 'bigint', default: 0 }),
    __metadata("design:type", String)
], DocumentSequence.prototype, "currentValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 16, default: '' }),
    __metadata("design:type", String)
], DocumentSequence.prototype, "prefix", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 6 }),
    __metadata("design:type", Number)
], DocumentSequence.prototype, "padding", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DocumentSequence.prototype, "updatedAt", void 0);
exports.DocumentSequence = DocumentSequence = __decorate([
    (0, typeorm_1.Entity)('document_sequences')
], DocumentSequence);
var SequenceKey;
(function (SequenceKey) {
    SequenceKey["RECEIPT"] = "receipt_number";
    SequenceKey["CLIENT"] = "client_code";
    SequenceKey["PROJECT"] = "project_code";
})(SequenceKey || (exports.SequenceKey = SequenceKey = {}));
//# sourceMappingURL=document-sequence.entity.js.map