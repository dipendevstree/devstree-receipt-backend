"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppException = void 0;
const common_1 = require("@nestjs/common");
class AppException extends common_1.HttpException {
    code;
    details;
    constructor(code, message, status = common_1.HttpStatus.BAD_REQUEST, details) {
        super({ code, message, details }, status);
        this.code = code;
        this.details = details;
    }
    static notFound(code, message) {
        return new AppException(code, message, common_1.HttpStatus.NOT_FOUND);
    }
    static forbidden(code, message) {
        return new AppException(code, message, common_1.HttpStatus.FORBIDDEN);
    }
    static unauthorized(code, message) {
        return new AppException(code, message, common_1.HttpStatus.UNAUTHORIZED);
    }
    static conflict(code, message) {
        return new AppException(code, message, common_1.HttpStatus.CONFLICT);
    }
    static badRequest(code, message, details) {
        return new AppException(code, message, common_1.HttpStatus.BAD_REQUEST, details);
    }
    static tooManyRequests(code, message, retryAfterSeconds) {
        return new AppException(code, message, common_1.HttpStatus.TOO_MANY_REQUESTS, { retryAfterSeconds });
    }
}
exports.AppException = AppException;
//# sourceMappingURL=app.exception.js.map