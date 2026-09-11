"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReqContext = void 0;
const common_1 = require("@nestjs/common");
function clientIp(request) {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim().slice(0, 45);
    }
    return (request.ip ?? request.socket?.remoteAddress ?? null)?.slice(0, 45) ?? null;
}
exports.ReqContext = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const userAgent = request.headers['user-agent'];
    return {
        ipAddress: clientIp(request),
        userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 255) : null,
    };
});
//# sourceMappingURL=request-context.decorator.js.map