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
exports.UnlockFinancialResponseDto = exports.FinancialStatusResponseDto = exports.UnlockFinancialDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UnlockFinancialDto {
    accountPassword;
}
exports.UnlockFinancialDto = UnlockFinancialDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The account password — separate from the login password.',
        example: '••••••••',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Account password is required.' }),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UnlockFinancialDto.prototype, "accountPassword", void 0);
class FinancialStatusResponseDto {
    unlocked;
    expiresAt;
    expiresInSeconds;
    unlockDurationMinutes;
}
exports.FinancialStatusResponseDto = FinancialStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], FinancialStatusResponseDto.prototype, "unlocked", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], FinancialStatusResponseDto.prototype, "expiresAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0, description: 'Seconds remaining on the unlock session' }),
    __metadata("design:type", Number)
], FinancialStatusResponseDto.prototype, "expiresInSeconds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 15 }),
    __metadata("design:type", Number)
], FinancialStatusResponseDto.prototype, "unlockDurationMinutes", void 0);
class UnlockFinancialResponseDto extends FinancialStatusResponseDto {
    token;
}
exports.UnlockFinancialResponseDto = UnlockFinancialResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Opaque unlock token. Send it as the x-financial-token header on subsequent requests. Keep it in memory only — never in localStorage or a cookie.',
    }),
    __metadata("design:type", String)
], UnlockFinancialResponseDto.prototype, "token", void 0);
//# sourceMappingURL=financial.dto.js.map