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
exports.ApiErrorResponse = exports.ApiSuccessResponse = void 0;
const swagger_1 = require("@nestjs/swagger");
class ApiSuccessResponse {
    success;
    data;
}
exports.ApiSuccessResponse = ApiSuccessResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], ApiSuccessResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], ApiSuccessResponse.prototype, "data", void 0);
class ApiErrorResponse {
    success;
    message;
    code;
    details;
}
exports.ApiErrorResponse = ApiErrorResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], ApiErrorResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Invalid account password' }),
    __metadata("design:type", String)
], ApiErrorResponse.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'INVALID_ACCOUNT_PASSWORD' }),
    __metadata("design:type", String)
], ApiErrorResponse.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: Object }),
    __metadata("design:type", Object)
], ApiErrorResponse.prototype, "details", void 0);
//# sourceMappingURL=api-response.dto.js.map