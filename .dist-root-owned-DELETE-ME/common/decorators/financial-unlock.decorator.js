"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialAccess = exports.RequireFinancialUnlock = exports.FINANCIAL_UNLOCK_REQUIRED_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.FINANCIAL_UNLOCK_REQUIRED_KEY = 'financialUnlockRequired';
const RequireFinancialUnlock = () => (0, common_1.SetMetadata)(exports.FINANCIAL_UNLOCK_REQUIRED_KEY, true);
exports.RequireFinancialUnlock = RequireFinancialUnlock;
exports.FinancialAccess = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return (request.financialAccess ?? { unlocked: false });
});
//# sourceMappingURL=financial-unlock.decorator.js.map