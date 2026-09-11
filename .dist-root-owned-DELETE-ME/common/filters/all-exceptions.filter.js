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
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const typeorm_1 = require("typeorm");
const error_codes_1 = require("../constants/error-codes");
const app_exception_1 = require("../exceptions/app.exception");
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    config;
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    constructor(config) {
        this.config = config;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const isProduction = this.config.get('app.isProduction') ?? false;
        const { status, body } = this.resolve(exception, isProduction);
        if (status >= common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(`${request.method} ${request.url} → ${status} ${body.code}`, exception instanceof Error ? exception.stack : String(exception));
        }
        else if (status === common_1.HttpStatus.UNAUTHORIZED || status === common_1.HttpStatus.FORBIDDEN) {
            this.logger.warn(`${request.method} ${request.url} → ${status} ${body.code}`);
        }
        response.status(status).json(body);
    }
    resolve(exception, isProduction) {
        if (exception instanceof app_exception_1.AppException) {
            const payload = exception.getResponse();
            return {
                status: exception.getStatus(),
                body: {
                    success: false,
                    message: payload.message,
                    code: payload.code,
                    ...(payload.details ? { details: payload.details } : {}),
                },
            };
        }
        if (exception instanceof throttler_1.ThrottlerException) {
            return {
                status: common_1.HttpStatus.TOO_MANY_REQUESTS,
                body: {
                    success: false,
                    message: 'Too many requests. Please slow down and try again shortly.',
                    code: error_codes_1.ErrorCode.TOO_MANY_REQUESTS,
                },
            };
        }
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const raw = exception.getResponse();
            return { status, body: this.fromHttpException(status, raw) };
        }
        if (exception instanceof typeorm_1.QueryFailedError) {
            const driverCode = exception.code;
            if (driverCode === PG_UNIQUE_VIOLATION) {
                return {
                    status: common_1.HttpStatus.CONFLICT,
                    body: {
                        success: false,
                        message: 'A record with these details already exists.',
                        code: error_codes_1.ErrorCode.CONFLICT,
                    },
                };
            }
            if (driverCode === PG_FOREIGN_KEY_VIOLATION) {
                return {
                    status: common_1.HttpStatus.CONFLICT,
                    body: {
                        success: false,
                        message: 'This record is referenced by other data and cannot be modified.',
                        code: error_codes_1.ErrorCode.CONFLICT,
                    },
                };
            }
            return {
                status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                body: {
                    success: false,
                    message: 'A database error occurred.',
                    code: error_codes_1.ErrorCode.INTERNAL_ERROR,
                },
            };
        }
        return {
            status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            body: {
                success: false,
                message: isProduction
                    ? 'An unexpected error occurred.'
                    : exception instanceof Error
                        ? exception.message
                        : 'An unexpected error occurred.',
                code: error_codes_1.ErrorCode.INTERNAL_ERROR,
            },
        };
    }
    fromHttpException(status, raw) {
        if (typeof raw === 'string') {
            return { success: false, message: raw, code: this.codeForStatus(status) };
        }
        const payload = (raw ?? {});
        if (Array.isArray(payload.message)) {
            return {
                success: false,
                message: payload.message[0] ?? 'Validation failed.',
                code: error_codes_1.ErrorCode.VALIDATION_FAILED,
                details: { errors: payload.message },
            };
        }
        return {
            success: false,
            message: payload.message ?? payload.error ?? 'Request failed.',
            code: payload.code ?? this.codeForStatus(status),
            ...(payload.details ? { details: payload.details } : {}),
        };
    }
    codeForStatus(status) {
        switch (status) {
            case common_1.HttpStatus.BAD_REQUEST:
                return error_codes_1.ErrorCode.VALIDATION_FAILED;
            case common_1.HttpStatus.UNAUTHORIZED:
                return error_codes_1.ErrorCode.UNAUTHORIZED;
            case common_1.HttpStatus.FORBIDDEN:
                return error_codes_1.ErrorCode.FORBIDDEN;
            case common_1.HttpStatus.NOT_FOUND:
                return error_codes_1.ErrorCode.NOT_FOUND;
            case common_1.HttpStatus.CONFLICT:
                return error_codes_1.ErrorCode.CONFLICT;
            case common_1.HttpStatus.TOO_MANY_REQUESTS:
                return error_codes_1.ErrorCode.TOO_MANY_REQUESTS;
            default:
                return error_codes_1.ErrorCode.INTERNAL_ERROR;
        }
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map