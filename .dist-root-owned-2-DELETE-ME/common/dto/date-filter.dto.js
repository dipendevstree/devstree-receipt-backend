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
exports.PaginatedDateFilterQueryDto = exports.DateFilterQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const pagination_dto_1 = require("./pagination.dto");
const date_range_util_1 = require("../utils/date-range.util");
const emptyToUndefined = ({ value }) => typeof value === 'string' ? value.trim() || undefined : value;
class DateFilterQueryDto {
    datePreset;
    dateFrom;
    dateTo;
    resolveRange() {
        return (0, date_range_util_1.resolveDateRange)({
            preset: this.datePreset,
            dateFrom: this.dateFrom,
            dateTo: this.dateTo,
        });
    }
}
exports.DateFilterQueryDto = DateFilterQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: date_range_util_1.DatePreset,
        description: 'Named window. `custom` uses dateFrom/dateTo; `all_time` applies no bound.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(emptyToUndefined),
    (0, class_validator_1.IsEnum)(date_range_util_1.DatePreset),
    __metadata("design:type", String)
], DateFilterQueryDto.prototype, "datePreset", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-01-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(emptyToUndefined),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DateFilterQueryDto.prototype, "dateFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-12-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(emptyToUndefined),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DateFilterQueryDto.prototype, "dateTo", void 0);
class PaginatedDateFilterQueryDto extends pagination_dto_1.PaginationQueryDto {
    datePreset;
    dateFrom;
    dateTo;
    resolveRange() {
        return (0, date_range_util_1.resolveDateRange)({
            preset: this.datePreset,
            dateFrom: this.dateFrom,
            dateTo: this.dateTo,
        });
    }
}
exports.PaginatedDateFilterQueryDto = PaginatedDateFilterQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: date_range_util_1.DatePreset }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(emptyToUndefined),
    (0, class_validator_1.IsEnum)(date_range_util_1.DatePreset),
    __metadata("design:type", String)
], PaginatedDateFilterQueryDto.prototype, "datePreset", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-01-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(emptyToUndefined),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], PaginatedDateFilterQueryDto.prototype, "dateFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-12-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(emptyToUndefined),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], PaginatedDateFilterQueryDto.prototype, "dateTo", void 0);
//# sourceMappingURL=date-filter.dto.js.map